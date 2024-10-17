import express from 'express'
import { ChatTogetherAI } from "@langchain/community/chat_models/togetherai";
import { PromptTemplate } from "@langchain/core/prompts";
import {createClient} from '@supabase/supabase-js'
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables";
import { combineDocuments } from './utils/combined.js'
import dotenv from 'dotenv'
import cors from 'cors'

dotenv.config()
const togetherkey = process.env.TOGETHER_AI_API_KEY
const sbApiKey = process.env.SUPABASE_API_KEY
const sbUrl = process.env.SUPABASE_URL
const hfApiKey = process.env.HUGGINGFACEHUB_API_KEY
const client = createClient(sbUrl, sbApiKey)
const embeddings = new HuggingFaceInferenceEmbeddings({hfApiKey})

const vectorStore = new SupabaseVectorStore(embeddings, {
    client,
    tableName: 'chuckgpt',
    queryName: 'match_chuckgpt'
})

const retriever = vectorStore.asRetriever()


const app = express()
const PORT = 3000
app.use(express.static('public'))
app.use(cors())
app.use(express.json())

app.post('/ask', async (req, res) => {
  const {question} = req.body
  if (!question) return res.status(400).json({error: 'Question required'})
  try {
    const llm = new ChatTogetherAI({
      togetherkey,
      model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
    });
    const standaloneQuestionTemplate ='Given a question, convert it to a standalone question. question: {question} standalone question:'
    const standaloneQuestionPrompt = PromptTemplate.fromTemplate(standaloneQuestionTemplate)
    const answerTemplate = `You are a helpful and enthusiastic support bot who can answer a given question about Dr.Chuck's courses based on the context provided. Try to find the answer in the context. If you really don't know the answer, say "I'm sorry, I don't know the answer to that." And direct the questioner to https://online.dr-chuck.com/. Don't try to make up an answer. Always speak as if you were chatting to a friend.
context: {context}
question: {question}
answer:
`
    const answerPrompt = PromptTemplate.fromTemplate(answerTemplate)
    const standaloneQuestionChain = standaloneQuestionPrompt
    .pipe(llm)
    .pipe(new StringOutputParser())

const retrieverChain = RunnableSequence.from([
    prevResult => prevResult.standalone_question,
    retriever,
    combineDocuments
])
const answerChain = answerPrompt
    .pipe(llm)
    .pipe(new StringOutputParser())

    const chain = RunnableSequence.from([
    {
        standalone_question: standaloneQuestionChain,
        original_input: new RunnablePassthrough()
    },
    {
        context: retrieverChain,
        question: ({ original_input }) => original_input.question
    },
    answerChain
])
    const response = await chain.invoke({ question: question });
    res.json({ response });
  } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred' });
    }
})


app.listen(PORT, () => console.log('Server running on port 3000'))
