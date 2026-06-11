/** Lê um arquivo como Data URL (base64). */
export function lerArquivoBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Lê uma imagem, redimensiona (máx. `maxLado` px) e comprime em JPEG.
 * Mantém o armazenamento (IndexedDB) e o PDF leves no uso em campo.
 */
export async function comprimirImagem(file: File, maxLado = 1100, quality = 0.7): Promise<string> {
  const dataUrl = await lerArquivoBase64(file)
  if (!file.type.startsWith('image/')) return dataUrl

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > maxLado || height > maxLado) {
        if (width >= height) {
          height = Math.round((height * maxLado) / width)
          width = maxLado
        } else {
          width = Math.round((width * maxLado) / height)
          height = maxLado
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(dataUrl)
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}
