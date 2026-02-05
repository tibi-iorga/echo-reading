export interface DictionaryDefinition {
  word: string
  phonetic?: string
  meanings: Array<{
    partOfSpeech: string
    definitions: Array<{
      definition: string
      example?: string
      synonyms?: string[]
      antonyms?: string[]
    }>
  }>
  sourceUrls?: string[]
}

export interface DictionaryError {
  title: string
  message: string
  resolution?: string
}

class DictionaryService {
  private readonly baseUrl = 'https://api.dictionaryapi.dev/api/v2/entries/en'

  async lookupWord(wordOrPhrase: string): Promise<DictionaryDefinition[]> {
    // Clean the word/phrase: trim and replace spaces with %20 for URL encoding
    const cleaned = wordOrPhrase.trim().replace(/\s+/g, '%20')
    
    if (!cleaned) {
      throw new Error('Empty word or phrase')
    }

    try {
      const response = await fetch(`${this.baseUrl}/${cleaned}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          const errorData: DictionaryError = await response.json().catch(() => ({
            title: 'No Definitions Found',
            message: `No definitions found for this word or phrase.`,
          }))
          throw new Error(errorData.message || 'No definitions found')
        }
        throw new Error(`Dictionary API error: ${response.statusText}`)
      }

      interface DictionaryAPIEntry {
        word?: string
        phonetic?: string
        phonetics?: Array<{ text?: string }>
        meanings?: Array<{
          partOfSpeech?: string
          definitions?: Array<{
            definition?: string
            example?: string
            synonyms?: string[]
            antonyms?: string[]
          }>
        }>
        sourceUrls?: string[]
      }
      
      const data: DictionaryAPIEntry[] = await response.json()
      
      // Transform the API response to our DictionaryDefinition format
      return data.map((entry) => ({
        word: entry.word || wordOrPhrase,
        phonetic: entry.phonetic || entry.phonetics?.[0]?.text,
        meanings: entry.meanings?.map((meaning) => ({
          partOfSpeech: meaning.partOfSpeech || '',
          definitions: meaning.definitions?.map((def) => ({
            definition: def.definition || '',
            example: def.example,
            synonyms: def.synonyms || [],
            antonyms: def.antonyms || [],
          })) || [],
        })) || [],
        sourceUrls: entry.sourceUrls || [],
      }))
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Failed to fetch dictionary definition')
    }
  }
}

export const dictionaryService = new DictionaryService()
