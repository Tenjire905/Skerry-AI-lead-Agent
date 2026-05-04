import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Language = "en" | "de";

const translations = {
  en: {
    // Sidebar
    "sidebar.dashboard": "Dashboard",
    "sidebar.leads": "Leads",
    "sidebar.forge": "Email Forge",
    "sidebar.settings": "Settings",
    "sidebar.icp": "ICP Builder",
    "sidebar.workspace": "Workspace",

    // Shell / header
    "shell.eyebrow": "Lead Generation",
    "shell.title": "Skerry",
    "shell.systemNominal": "System running",
    "shell.runPipeline": "Find New Leads",

    // Settings page
    "settings.eyebrow.integrations": "Integrations",
    "settings.title.api": "API Connections",
    "settings.title.status": "Status",
    "settings.subtitle": "Health of every external system the pipeline depends on.",
    "settings.status.connected": "Connected",
    "settings.status.reauth": "Re-auth",
    "settings.eyebrow.preferences": "Preferences",
    "settings.title.language": "Language",
    "settings.language.subtitle": "Choose the interface language.",
    "settings.language.en": "English",
    "settings.language.de": "German",
    "integrations.apify.desc": "Lead Discovery",
    "integrations.openai.desc": "AI Analysis",
    "integrations.gdrive.desc": "Document Creation",
    "integrations.instantly.desc": "Email Sending",

    // Index / Pulse dashboard
    "pulse.eyebrow": "Lead Generation",
    "pulse.titleAccent": "Dashboard.",
    "pulse.titleRest": "Your leads, in real time.",
    "pulse.subtitle":
      "Lead discovery, AI analysis, email generation, and sending — every step tracked.",
    "pulse.stat.scanned": "Leads Found",
    "pulse.stat.insights": "Insights Generated",
    "pulse.stat.newsletters": "Emails Ready",
    "pulse.stat.pushed": "Sent",
    "pulse.feed.title": "Live feed",
    "pulse.feed.subtitle": "Leads moving through the pipeline.",
    "pulse.feed.streaming": "streaming",
    "pulse.stage.scraping": "Scraping",
    "pulse.stage.analyzing": "Analyzing",
    "pulse.stage.generating": "Generating",
    "pulse.stage.done": "Done",
    "pulse.stage.missing": "Missing contact",
    "pulse.integrity.title": "System Health",
    "pulse.integrity.subtitle": "Stage health across last 24h.",
    "pulse.integrity.apify": "Lead Discovery",
    "pulse.integrity.scraping": "Source",
    "pulse.integrity.gpt": "Analyze",
    "pulse.integrity.instantly": "Send",
    "pulse.focus.title": "Today's focus",
    "pulse.focus.subtitle": "5 high-signal leads completed extraction. 3 are ready to send.",
    "pulse.focus.cta": "View Leads",

    // Workspace page
    "workspace.eyebrow": "Lead Details",
    "workspace.titleAccent": "Lead.",
    "workspace.toast.pushed": "Lead sent to campaign 3ea7e816...",
    "workspace.org": "Organization",
    "workspace.website": "Website",
    "workspace.linkedin": "LinkedIn",
    "workspace.linkedinView": "View profile",
    "workspace.email": "Email",
    "workspace.emailMissing": "Not found",
    "workspace.verifiedEmail": "Verified Email",
    "workspace.missingContact": "Missing Contact",
    "workspace.intel.eyebrow": "Intelligence",
    "workspace.intel.title": "AI Analysis",
    "workspace.tab.site": "Site Intel",
    "workspace.tab.bio": "Bio",
    "workspace.tab.strategy": "Strategy",
    "workspace.forge.eyebrow": "Email Forge",
    "workspace.forge.cannotPush": "Cannot send email",
    "workspace.forge.cannotPushDesc": "Missing contact email.",
    "workspace.forge.sync": "Send via Instantly",
    "workspace.forge.pushing": "Sending…",
    "workspace.forge.synced": "Sent",
    "workspace.forge.missingEmail": "Missing email",

    // Insight page
    "insight.eyebrow": "Lead Intelligence",
    "insight.titleA": "Lead",
    "insight.titleB": "Insight",
    "insight.subtitle":
      "Structured intelligence from GPT-4. Two paragraphs of site context, full personal profile, three sharpened angles.",
    "insight.enriched": "Enriched leads",
    "insight.missingContact": "Missing contact",
    "insight.tab.site": "Site Intel",
    "insight.tab.bio": "Bio",
    "insight.tab.strategy": "Strategy",
    "insight.angle": "angle",

    // Forge page
    "forge.eyebrow": "Email Forge",
    "forge.titleA": "Email",
    "forge.titleB": "Forge",
    "forge.subtitle":
      'Variables on the left, email preview on the right. Send via Instantly.ai when ready.',
    "forge.variables": "Variables",
    "forge.variablesSub": "Extracted from lead data + AI enrichment.",
    "forge.missingValue": "Missing value",
    "forge.copyVar": "Copy variable",
    "forge.missingContact": "Missing contact",
    "forge.missingContactDesc":
      "This lead has no email — sending is disabled.",
    "forge.previewLabel": "Email Preview",
    "forge.push": "Send via Instantly.ai",
    "forge.pushing": "Sending…",
    "forge.injected": "Email sent",
    "forge.missingEmail": "Missing email",

    // StepProgress
    "step.source.label": "Source",
    "step.source.sub": "Discovery",
    "step.analyze.label": "Analyze",
    "step.analyze.sub": "AI",
    "step.draft.label": "Write",
    "step.draft.sub": "Email",
    "step.send.label": "Send",
    "step.send.sub": "Instantly",
  },
  de: {
    // Sidebar
    "sidebar.workspace": "Arbeitsbereich",
    "sidebar.dashboard": "Übersicht",
    "sidebar.leads": "Leads",
    "sidebar.forge": "Forge",
    "sidebar.settings": "Einstellungen",
    "sidebar.icp": "ICP-Builder",

    // Shell / header
    "shell.eyebrow": "Asset-basiert",
    "shell.title": "Cold-Outreach-System",
    "shell.systemNominal": "System läuft",
    "shell.runPipeline": "Pipeline starten",

    // Settings page
    "settings.eyebrow.integrations": "Integrationen",
    "settings.title.api": "API",
    "settings.title.status": "Status",
    "settings.subtitle": "Status aller externen Systeme, von denen die Pipeline abhängt.",
    "settings.status.connected": "Verbunden",
    "settings.status.reauth": "Neu anmelden",
    "settings.eyebrow.preferences": "Einstellungen",
    "settings.title.language": "Sprache",
    "settings.language.subtitle": "Wähle die Sprache der Oberfläche.",
    "settings.language.en": "Englisch",
    "settings.language.de": "Deutsch",
    "integrations.apify.desc": "Lead-Datensatz-Import (Apollo)",
    "integrations.openai.desc": "GPT-4 Anreicherung & Extraktion",
    "integrations.gdrive.desc": "Newsletter-Dokument erstellen",
    "integrations.instantly.desc": "Lead-Injection & Kadenz",

    // Index / Pulse dashboard
    "pulse.eyebrow": "Asset-basiertes Cold Outreach",
    "pulse.titleAccent": "Pulse.",
    "pulse.titleRest": "Dein Outbound, in Echtzeit beobachtet.",
    "pulse.subtitle":
      "Apify-Ingestion, GPT-4-Anreicherung, Newsletter-Schmiede und Instantly-Versand — jeder Schritt überwacht.",
    "pulse.stat.scanned": "Gescannte Leads",
    "pulse.stat.insights": "Extrahierte Insights",
    "pulse.stat.newsletters": "Erstellte Newsletter",
    "pulse.stat.pushed": "An Instantly gesendet",
    "pulse.feed.title": "Live-Feed",
    "pulse.feed.subtitle": "Leads, die durch die Pipeline laufen.",
    "pulse.feed.streaming": "Streaming",
    "pulse.stage.scraping": "Scraping",
    "pulse.stage.analyzing": "Analyse",
    "pulse.stage.generating": "Generierung",
    "pulse.stage.done": "Fertig",
    "pulse.stage.missing": "Kontakt fehlt",
    "pulse.integrity.title": "Pipeline-Integrität",
    "pulse.integrity.subtitle": "Status der Phasen in den letzten 24 Std.",
    "pulse.integrity.apify": "Apify-Ingestion",
    "pulse.integrity.scraping": "Website-Scraping",
    "pulse.integrity.gpt": "GPT-4-Extraktion",
    "pulse.integrity.instantly": "Instantly-Push",
    "pulse.focus.title": "Heutiger Fokus",
    "pulse.focus.subtitle":
      "5 starke Leads haben die Extraktion abgeschlossen. 3 sind bereit für die Schmiede.",
    "pulse.focus.cta": "Forge öffnen",

    // Workspace page
    "workspace.eyebrow": "Lead-Arbeitsbereich",
    "workspace.titleAccent": "Pipeline.",
    "workspace.toast.pushed": "Lead an Kampagne 3ea7e816 gesendet...",
    "workspace.org": "Unternehmen",
    "workspace.website": "Website",
    "workspace.linkedin": "LinkedIn",
    "workspace.linkedinView": "Profil ansehen",
    "workspace.email": "E-Mail",
    "workspace.emailMissing": "Nicht gefunden",
    "workspace.verifiedEmail": "Verifizierte E-Mail",
    "workspace.missingContact": "Kontakt fehlt",
    "workspace.intel.eyebrow": "Intelligence",
    "workspace.intel.title": "GPT-4-Extraktion",
    "workspace.tab.site": "Website-Intel",
    "workspace.tab.bio": "Profil",
    "workspace.tab.strategy": "Strategie",
    "workspace.forge.eyebrow": "Die Schmiede",
    "workspace.forge.cannotPush": "Lead kann nicht gesendet werden",
    "workspace.forge.cannotPushDesc": "Keine Kontakt-E-Mail vorhanden.",
    "workspace.forge.sync": "Mit Instantly synchen",
    "workspace.forge.pushing": "Wird gesendet…",
    "workspace.forge.synced": "Synchronisiert",
    "workspace.forge.missingEmail": "E-Mail fehlt",

    // Insight page
    "insight.eyebrow": "Das Gehirn",
    "insight.titleA": "Lead",
    "insight.titleB": "Insight",
    "insight.subtitle":
      "Strukturierte Intelligence von GPT-4. Zwei Absätze Website-Kontext, vollständiges Profil, drei geschärfte Ansätze.",
    "insight.enriched": "Angereicherte Leads",
    "insight.missingContact": "Kontakt fehlt",
    "insight.tab.site": "Website-Intel",
    "insight.tab.bio": "Profil",
    "insight.tab.strategy": "Strategie",
    "insight.angle": "Ansatz",

    // Forge page
    "forge.eyebrow": "Die Schmiede",
    "forge.titleA": "Newsletter",
    "forge.titleB": "Forge",
    "forge.subtitle":
      'Variablen links, „The Cusp" rechts gerendert. An Instantly.ai senden, sobald bereit.',
    "forge.variables": "Variablen",
    "forge.variablesSub": "Extrahiert aus Apify + GPT-4-Anreicherung.",
    "forge.missingValue": "Wert fehlt",
    "forge.copyVar": "Variable kopieren",
    "forge.missingContact": "Kontakt fehlt",
    "forge.missingContactDesc":
      "Dieser Lead hat keine E-Mail — Versand an Instantly.ai ist deaktiviert.",
    "forge.previewLabel": "The Cusp · Markdown-Vorschau",
    "forge.push": "An Instantly.ai senden",
    "forge.pushing": "Wird gesendet…",
    "forge.injected": "Lead eingespeist",
    "forge.missingEmail": "E-Mail fehlt",

    // StepProgress
    "step.source.label": "Quelle",
    "step.source.sub": "Apify",
    "step.analyze.label": "Analyse",
    "step.analyze.sub": "GPT-4",
    "step.draft.label": "Entwurf",
    "step.draft.sub": "Markdown",
    "step.send.label": "Senden",
    "step.send.sub": "Instantly",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["en"];

interface LanguageStore {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      language: "en",
      setLanguage: (language) => set({ language }),
    }),
    { name: "skerry-language" },
  ),
);

export function useT() {
  const language = useLanguageStore((s) => s.language);
  return (key: TranslationKey) => translations[language][key] ?? key;
}
