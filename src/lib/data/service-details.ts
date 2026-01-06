import type { ServiceDetailContent } from '@/types/recommendation'

export const serviceDetailContent: Record<string, ServiceDetailContent> = {
  'business-branding-foundation': {
    title: 'Business Branding Foundation',
    tagline: 'Build the brand identity that makes customers choose you.',
    intro: 'Your business needs more than a logo—it needs a clear, compelling identity that sticks in customers\' minds. But too many small businesses operate with generic visuals, inconsistent messaging, and no real understanding of what makes them different.',
    callout: {
      label: 'Why you need this:',
      text: 'Customers can\'t choose you if they can\'t remember you—or if they don\'t understand why you\'re different from everyone else. A scattered brand sends mixed signals and undermines trust before you even get a chance to compete.',
    },
    simpleTerm: 'We give your business the strategic foundation that makes customers remember you, trust you, and choose you over the competition.',
    summary: 'Here\'s what you\'ll receive—four comprehensive deliverables that form your complete brand foundation:',
    deliverables: [
      {
        number: '01',
        title: 'Strategic Positioning & Brand Framework',
        description: 'We define what makes your business different and build the foundational identity that everything else grows from. This document establishes the mental territory you own in your market—the concept that makes competitors irrelevant.',
        features: [
          { title: 'Brand Positioning Statement', description: 'The strategic concept you own in customers\' minds that competitors can\'t copy' },
          { title: 'Core Positioning Concept', description: 'Your unique mental territory—the noun you own, not just the verbs you do' },
          { title: 'Four Levels of Positioning', description: 'Saying it, proving it, being it, and owning it—a complete strategic framework' },
          { title: 'Brand Story Framework', description: 'The problem, insight, solution, proof, and difference that tells your story' },
          { title: 'Implementation Roadmap', description: 'Phased action plan with success metrics to bring your positioning to life' },
        ],
      },
      {
        number: '02',
        title: 'Brand Messaging & Go-To-Market Playbook',
        description: 'Clear, compelling language that speaks directly to your ideal customers and guides how you show up in the market. Every word, every message, every conversation reinforces your strategic positioning.',
        features: [
          { title: 'Target Customer Personas', description: 'Deep profiles of your ideal customers—their pain points, motivations, and decision criteria' },
          { title: 'Key Messaging Pillars', description: 'Core messages with supporting points and proof points for each pillar' },
          { title: 'Tagline Options', description: 'Multiple professionally crafted taglines with strategic rationale for each' },
          { title: 'Brand Voice & Tone Guidelines', description: 'How your brand sounds across every scenario—with specific examples' },
          { title: 'Sales Scripts & Frameworks', description: 'Ready-to-use conversation frameworks for common sales scenarios and objections' },
          { title: 'Competitive Objection Handling', description: 'Word-for-word responses to competitive objections that reinforce your positioning' },
        ],
      },
      {
        number: '03',
        title: 'Competitive Comparison Analysis',
        description: 'A clear-eyed look at your competition so you know exactly where you stand and how to cultivate your advantage. We analyze your competitive landscape and show you how to position against—or alongside—other players.',
        features: [
          { title: 'Competitive Landscape Analysis', description: 'Who your actual competitors are and which market segments they occupy' },
          { title: 'Detailed Comparison Tables', description: 'Side-by-side comparison of business models, services, and positioning' },
          { title: 'Your Unique Advantages', description: 'What you have that competitors don\'t—framed as proof of your positioning' },
          { title: 'Differentiation Messages', description: 'Ready-to-use language for when prospects compare you to competitors' },
          { title: 'Strategic Opportunities', description: 'Partnership or positioning opportunities based on competitive gaps' },
        ],
      },
      {
        number: '+',
        title: 'Brand Color Guidelines',
        description: 'A complete color system that conveys the right emotions and maintains consistency across all touchpoints—from your website to your business cards. <strong>Pairs perfectly with any of our website packages</strong> (WordPress or AI-powered sites), giving your developer exact specifications to bring your brand to life online.',
        isBonus: true,
        features: [
          { title: 'Primary & Secondary Palettes', description: 'Core colors with variations for different applications' },
          { title: 'CTA & Button Colors', description: 'Action-driving colors with hover and active states' },
          { title: 'Text & Background Colors', description: 'Accessible color combinations for all content types' },
          { title: 'Component Color Applications', description: 'Specific guidance for headers, cards, forms, and more' },
        ],
      },
    ],
    cta: {
      title: 'The Complete Brand Foundation',
      text: 'Everything you need to build a brand that customers remember, trust, and choose—delivered as polished, professional documents ready to guide your marketing for years to come.',
    },
  },

  'ai-visibility-foundation': {
    title: 'AI Visibility Foundation',
    tagline: 'Build the root system AI platforms need to find and recommend you.',
    intro: 'The way customers find businesses is changing. Instead of scrolling through search results, more people are asking AI assistants like ChatGPT, Google AI Overviews, and Siri for direct recommendations. If your website isn\'t set up to communicate with these tools, you\'re invisible to a growing segment of your market.',
    callout: {
      label: 'Why you need this:',
      text: 'AI assistants need specific signals to understand and recommend your business. Without the right technical groundwork, these tools either skip over you or misrepresent what you do. This service builds your complete AI-friendly foundation—a one-time implementation that prepares every page of your site to be discovered.',
    },
    simpleTerm: 'We dig the irrigation channels and plant the root system so AI tools can find you across your entire site.',
    summary: 'Here\'s what\'s included in your AI Visibility Foundation:',
    imageUrl: 'https://pyrusdev.wpenginepowered.com/wp-content/uploads/2025/12/AI-Visibility-Essentials-.png',
    deliverables: [
      {
        number: '01',
        title: 'Complete Site Audit',
        description: 'We analyze every page of your site to identify what AI platforms can and can\'t see—mapping exactly what needs to be optimized for AI discovery.',
        features: [],
      },
      {
        number: '02',
        title: 'AI Instruction File',
        description: 'We create a dedicated file that tells AI crawlers exactly what your business offers and how to describe you—ensuring AI assistants represent you accurately when customers ask.',
        features: [],
      },
      {
        number: '03',
        title: 'Full Structured Data Implementation',
        description: 'We implement the technical markup across all your service pages, location info, and reputation signals—giving AI platforms the structured data they need to understand and recommend your complete offerings.',
        features: [],
      },
    ],
    cta: {
      title: 'Your Foundation, Fully Planted',
      text: 'This is project work with a clear finish line. Once complete, your entire site—whether that\'s 10 pages or 50—will be optimized for AI discovery. You\'ll have the technical infrastructure that positions you to be recommended when customers ask AI assistants about businesses like yours.',
    },
    upsell: {
      title: 'Want to track how it\'s working?',
      text: 'Once your foundation is in place, our <strong>AI Visibility Monitoring</strong> service ($149/month) tracks your AI citation performance, adjusts as platforms evolve, and provides monthly reporting on how you\'re showing up in AI recommendations.',
    },
  },
}
