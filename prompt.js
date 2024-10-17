import { ChatTogetherAI } from "@langchain/community/chat_models/togetherai";
import { PromptTemplate } from "@langchain/core/prompts";
import dotenv from 'dotenv'

dotenv.config()

const togetherkey = process.env.TOGETHER_AI_API_KEY

const llm = new ChatTogetherAI({
  togetherkey,
  model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
});

const tweetTemplate = 'Generate a promotional tweet for a product, from this product description: {productDesc}'
const tweetPrompt = PromptTemplate.fromTemplate(tweetTemplate)

console.log(tweetPrompt)
