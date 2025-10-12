import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export class MijnStemService {
  private static instance: MijnStemService;
  private supabase;

  private constructor() {
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  public static getInstance(): MijnStemService {
    if (!MijnStemService.instance) {
      MijnStemService.instance = new MijnStemService();
    }
    return MijnStemService.instance;
  }

  async getUserWritingStyle(userId: string): Promise<any | null> {
    try {
      const { data: documents, error } = await this.supabase
        .from('mijn_stem_documents')
        .select('writing_style, filename, analyzed_at')
        .eq('user_id', userId)
        .eq('status', 'analyzed')
        .order('analyzed_at', { ascending: false });

      if (error || !documents || documents.length === 0) {
        return null;
      }

      // Combine all writing styles into a master style profile
      const masterStyle = this.combineWritingStyles(documents.map(doc => doc.writing_style));

      return masterStyle;
    } catch (error) {
      console.error('Error fetching user writing style:', error);
      return null;
    }
  }

  private combineWritingStyles(styles: any[]): any {
    if (styles.length === 0) return null;
    if (styles.length === 1) return styles[0];

    // Combine multiple writing styles into a master style
    const combined = {
      tone: this.mostCommonValue(styles.map(s => s.tone)),
      structure: this.mostCommonValue(styles.map(s => s.structure)),
      language_usage: this.mostCommonValue(styles.map(s => s.language_usage)),
      sentence_length: this.mostCommonValue(styles.map(s => s.sentence_length)),
      paragraph_length: this.mostCommonValue(styles.map(s => s.paragraph_length)),
      perspective: this.mostCommonValue(styles.map(s => s.perspective)),
      formality: this.mostCommonValue(styles.map(s => s.formality)),
      special_elements: this.mostCommonValue(styles.map(s => s.special_elements)),
      sample_phrases: styles.flatMap(s => s.sample_phrases || []).slice(0, 10), // Top 10 phrases
      writing_guidelines: styles.flatMap(s => s.writing_guidelines || []),
      combined_from: styles.length,
      last_updated: new Date().toISOString()
    };

    return combined;
  }

  private mostCommonValue(values: string[]): string {
    const counts: { [key: string]: number } = {};
    values.forEach(value => {
      if (value) {
        counts[value] = (counts[value] || 0) + 1;
      }
    });

    let mostCommon = '';
    let maxCount = 0;
    Object.entries(counts).forEach(([value, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = value;
      }
    });

    return mostCommon || values[0] || '';
  }

  generateStylePrompt(userWritingStyle: any): string {
    if (!userWritingStyle) {
      return '';
    }

    return `
PERSOONLIJKE SCHRIJFSTIJL INSTRUCTIES:
De gebruiker heeft een specifieke schrijfstijl die geanalyseerd is uit eerdere documenten. 
Houd je aan deze stijl bij het genereren van de content:

TONALITEIT: ${userWritingStyle.tone || 'Zakelijk'}
STRUCTUUR: ${userWritingStyle.structure || 'Gestructureerd'}
TAALGEBRUIK: ${userWritingStyle.language_usage || 'Professioneel Nederlands'}
ZINLENGTE: ${userWritingStyle.sentence_length || 'Gemiddeld'}
ALINEALENGTE: ${userWritingStyle.paragraph_length || 'Gemiddeld'}
PERSPECTIEF: ${userWritingStyle.perspective || 'Derde persoon'}
FORMALITEIT: ${userWritingStyle.formality || 'Formeel'}
SPECIALE ELEMENTEN: ${userWritingStyle.special_elements || 'Standaard'}

KARAKTERISTIEKE ZINNEN UIT DE GEBRUIKER ZIJN STIJL:
${userWritingStyle.sample_phrases?.slice(0, 5).map((phrase: string) => `- "${phrase}"`).join('\n') || 'Geen voorbeelden beschikbaar'}

SCHRIJFRICHTLIJNEN:
${userWritingStyle.writing_guidelines?.slice(0, 5).map((guideline: string) => `- ${guideline}`).join('\n') || 'Geen specifieke richtlijnen'}

BELANGRIJK: Repliceer deze schrijfstijl zo nauwkeurig mogelijk in je output. Gebruik dezelfde toon, structuur en taalgebruik.
`.trim();
  }
}
