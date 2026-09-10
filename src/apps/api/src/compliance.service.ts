import { Injectable } from '@nestjs/common';

export type ComplianceSource = { id: string; title: string; sectionRef: string; paragraph: string };

@Injectable()
export class ComplianceService {
  answer(question: string, documents: ComplianceSource[]) {
    const terms = question.toLowerCase().split(/[^a-z0-9]+/).filter(term => term.length > 2);
    const ranked = documents.map(document => {
      const text = `${document.title} ${document.sectionRef} ${document.paragraph}`.toLowerCase();
      const matches = terms.filter(term => text.includes(term)).length;
      return { document, matches };
    }).filter(item => item.matches > 0).sort((a, b) => b.matches - a.matches).slice(0, 3);
    const citations = ranked.map(item => ({ title: item.document.title, sectionRef: item.document.sectionRef, documentId: item.document.id }));
    const answer = ranked.length ? ranked.map(item => item.document.paragraph).join(' ') : 'No authoritative source paragraph matched this question. Please escalate to a Legal Metrology officer.';
    return { answer, citations, confidence: ranked.length ? Math.min(0.95, 0.45 + ranked[0].matches * 0.12) : 0.05 };
  }
}
