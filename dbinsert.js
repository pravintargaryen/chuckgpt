import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import {promises as fs} from 'fs';
import {createClient} from '@supabase/supabase-js'
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import dotenv from 'dotenv'

dotenv.config()

try {
  const result = await fs.readFile('info.txt', 'utf8')
  const splitter = new RecursiveCharacterTextSplitter({
    separators:['\n\n', '\n', ' ', ''],
    chunkSize:500,
    chunkOverlap:50,
  })

    const output = await splitter.createDocuments([result])

    const sbApiKey = process.env.SUPABASE_API_KEY
    const sbUrl = process.env.SUPABASE_URL
    const hfApiKey = process.env.HUGGINGFACEHUB_API_KEY

    const client = createClient(sbUrl, sbApiKey)

    await SupabaseVectorStore.fromDocuments(
      output,
      new HuggingFaceInferenceEmbeddings({hfApiKey}),
      {
        client,
        tableName: 'docs',
      }
    )


} catch (err) {
  console.log(err)
}
