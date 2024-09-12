import z from 'zod'

const envShema = z.object({
  DATABASE_URL: z.string().url(),
})

export const env = envShema.parse(process.env)
