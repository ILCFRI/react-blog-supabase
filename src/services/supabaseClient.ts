import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
)

export const uploadImage = async (file: File, folder: string) => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${crypto.randomUUID()}.${fileExt}`
  const filePath = `${folder}/${fileName}`

  const { error } = await supabase.storage
    .from('blog-images')
    .upload(filePath, file)

  if (error) throw error

  const { data } = supabase
    .storage
    .from('blog-images')
    .getPublicUrl(filePath)

  return data.publicUrl
}