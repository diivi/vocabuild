export interface CuratedWord {
  word: string;
  definition: string;
  partOfSpeech: string;
  synonyms: string[];
  antonyms: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
}

export const curatedWords: CuratedWord[] = [
  // Beginner
  { word: "abate", definition: "To become less intense or widespread", partOfSpeech: "verb", synonyms: ["diminish", "subside", "lessen"], antonyms: ["intensify", "increase"], difficulty: "beginner" },
  { word: "candid", definition: "Truthful and straightforward; frank", partOfSpeech: "adjective", synonyms: ["frank", "honest", "open"], antonyms: ["dishonest", "deceitful"], difficulty: "beginner" },
  { word: "diligent", definition: "Having or showing care and conscientiousness in one's work", partOfSpeech: "adjective", synonyms: ["industrious", "hardworking", "assiduous"], antonyms: ["lazy", "idle"], difficulty: "beginner" },
  { word: "eloquent", definition: "Fluent or persuasive in speaking or writing", partOfSpeech: "adjective", synonyms: ["articulate", "expressive", "fluent"], antonyms: ["inarticulate", "tongue-tied"], difficulty: "beginner" },
  { word: "frugal", definition: "Sparing or economical with regard to money or food", partOfSpeech: "adjective", synonyms: ["thrifty", "economical", "prudent"], antonyms: ["extravagant", "wasteful"], difficulty: "beginner" },
  { word: "gregarious", definition: "Fond of company; sociable", partOfSpeech: "adjective", synonyms: ["sociable", "outgoing", "convivial"], antonyms: ["introverted", "reclusive"], difficulty: "beginner" },
  { word: "hinder", definition: "Create difficulties for, resulting in delay or obstruction", partOfSpeech: "verb", synonyms: ["obstruct", "impede", "hamper"], antonyms: ["facilitate", "aid"], difficulty: "beginner" },
  { word: "impartial", definition: "Treating all rivals or disputants equally; fair and just", partOfSpeech: "adjective", synonyms: ["unbiased", "neutral", "objective"], antonyms: ["biased", "partial"], difficulty: "beginner" },
  { word: "jubilant", definition: "Feeling or expressing great happiness and triumph", partOfSpeech: "adjective", synonyms: ["overjoyed", "elated", "exultant"], antonyms: ["despondent", "sorrowful"], difficulty: "beginner" },
  { word: "keen", definition: "Eager or enthusiastic", partOfSpeech: "adjective", synonyms: ["eager", "enthusiastic", "avid"], antonyms: ["apathetic", "indifferent"], difficulty: "beginner" },
  { word: "lament", definition: "A passionate expression of grief or sorrow", partOfSpeech: "noun", synonyms: ["wail", "moan", "grievance"], antonyms: ["celebration", "rejoicing"], difficulty: "beginner" },
  { word: "mundane", definition: "Lacking interest or excitement; dull", partOfSpeech: "adjective", synonyms: ["humdrum", "tedious", "routine"], antonyms: ["extraordinary", "exciting"], difficulty: "beginner" },
  { word: "novel", definition: "New or unusual in an interesting way", partOfSpeech: "adjective", synonyms: ["new", "original", "fresh"], antonyms: ["familiar", "ordinary"], difficulty: "beginner" },
  { word: "ominous", definition: "Giving the impression that something bad is going to happen", partOfSpeech: "adjective", synonyms: ["threatening", "menacing", "sinister"], antonyms: ["auspicious", "promising"], difficulty: "beginner" },
  { word: "pragmatic", definition: "Dealing with things sensibly and realistically", partOfSpeech: "adjective", synonyms: ["practical", "realistic", "sensible"], antonyms: ["idealistic", "impractical"], difficulty: "beginner" },

  // Intermediate
  { word: "acrimony", definition: "Bitterness or ill feeling", partOfSpeech: "noun", synonyms: ["bitterness", "hostility", "rancor"], antonyms: ["goodwill", "harmony"], difficulty: "intermediate" },
  { word: "belligerent", definition: "Hostile and aggressive", partOfSpeech: "adjective", synonyms: ["aggressive", "hostile", "combative"], antonyms: ["peaceful", "friendly"], difficulty: "intermediate" },
  { word: "capricious", definition: "Given to sudden and unaccountable changes of mood or behavior", partOfSpeech: "adjective", synonyms: ["fickle", "unpredictable", "mercurial"], antonyms: ["steadfast", "constant"], difficulty: "intermediate" },
  { word: "debilitate", definition: "Make someone weak and infirm", partOfSpeech: "verb", synonyms: ["weaken", "enfeeble", "enervate"], antonyms: ["strengthen", "invigorate"], difficulty: "intermediate" },
  { word: "ephemeral", definition: "Lasting for a very short time", partOfSpeech: "adjective", synonyms: ["fleeting", "transient", "momentary"], antonyms: ["permanent", "enduring"], difficulty: "intermediate" },
  { word: "fastidious", definition: "Very attentive to and concerned about accuracy and detail", partOfSpeech: "adjective", synonyms: ["meticulous", "scrupulous", "particular"], antonyms: ["careless", "sloppy"], difficulty: "intermediate" },
  { word: "garrulous", definition: "Excessively talkative, especially on trivial matters", partOfSpeech: "adjective", synonyms: ["talkative", "loquacious", "verbose"], antonyms: ["taciturn", "reticent"], difficulty: "intermediate" },
  { word: "hapless", definition: "Unfortunate; unlucky", partOfSpeech: "adjective", synonyms: ["unfortunate", "unlucky", "ill-fated"], antonyms: ["fortunate", "lucky"], difficulty: "intermediate" },
  { word: "iconoclast", definition: "A person who attacks cherished beliefs or institutions", partOfSpeech: "noun", synonyms: ["rebel", "nonconformist", "dissenter"], antonyms: ["conformist", "traditionalist"], difficulty: "intermediate" },
  { word: "juxtapose", definition: "Place or deal with close together for contrasting effect", partOfSpeech: "verb", synonyms: ["compare", "contrast", "set side by side"], antonyms: ["separate", "disconnect"], difficulty: "intermediate" },
  { word: "laconic", definition: "Using very few words", partOfSpeech: "adjective", synonyms: ["brief", "concise", "terse"], antonyms: ["verbose", "wordy"], difficulty: "intermediate" },
  { word: "magnanimous", definition: "Very generous or forgiving, especially toward a rival", partOfSpeech: "adjective", synonyms: ["generous", "charitable", "benevolent"], antonyms: ["petty", "vindictive"], difficulty: "intermediate" },
  { word: "nefarious", definition: "Wicked or criminal", partOfSpeech: "adjective", synonyms: ["wicked", "villainous", "heinous"], antonyms: ["virtuous", "righteous"], difficulty: "intermediate" },
  { word: "obsequious", definition: "Obedient or attentive to an excessive or servile degree", partOfSpeech: "adjective", synonyms: ["sycophantic", "fawning", "servile"], antonyms: ["domineering", "assertive"], difficulty: "intermediate" },
  { word: "pernicious", definition: "Having a harmful effect, especially in a gradual or subtle way", partOfSpeech: "adjective", synonyms: ["harmful", "destructive", "detrimental"], antonyms: ["beneficial", "wholesome"], difficulty: "intermediate" },

  // Advanced
  { word: "aberrant", definition: "Departing from an accepted standard", partOfSpeech: "adjective", synonyms: ["deviant", "anomalous", "atypical"], antonyms: ["normal", "typical"], difficulty: "advanced" },
  { word: "blandishment", definition: "A flattering or pleasing statement used to persuade", partOfSpeech: "noun", synonyms: ["flattery", "cajolery", "coaxing"], antonyms: ["criticism", "censure"], difficulty: "advanced" },
  { word: "churlish", definition: "Rude in a mean-spirited and surly way", partOfSpeech: "adjective", synonyms: ["rude", "boorish", "uncouth"], antonyms: ["polite", "courteous"], difficulty: "advanced" },
  { word: "deleterious", definition: "Causing harm or damage", partOfSpeech: "adjective", synonyms: ["harmful", "injurious", "detrimental"], antonyms: ["beneficial", "advantageous"], difficulty: "advanced" },
  { word: "equivocate", definition: "Use ambiguous language so as to conceal the truth", partOfSpeech: "verb", synonyms: ["prevaricate", "hedge", "be evasive"], antonyms: ["be direct", "be frank"], difficulty: "advanced" },
  { word: "furtive", definition: "Attempting to avoid notice or attention, typically because of guilt", partOfSpeech: "adjective", synonyms: ["secretive", "stealthy", "surreptitious"], antonyms: ["open", "overt"], difficulty: "advanced" },
  { word: "grandiloquent", definition: "Pompous or extravagant in language, style, or manner", partOfSpeech: "adjective", synonyms: ["pompous", "bombastic", "pretentious"], antonyms: ["understated", "modest"], difficulty: "advanced" },
  { word: "hegemony", definition: "Leadership or dominance, especially by one state over others", partOfSpeech: "noun", synonyms: ["dominance", "supremacy", "authority"], antonyms: ["subordination", "weakness"], difficulty: "advanced" },
  { word: "insouciant", definition: "Showing a casual lack of concern; indifferent", partOfSpeech: "adjective", synonyms: ["nonchalant", "carefree", "unconcerned"], antonyms: ["anxious", "concerned"], difficulty: "advanced" },
  { word: "jejune", definition: "Naive, simplistic, and superficial", partOfSpeech: "adjective", synonyms: ["naive", "simplistic", "unsophisticated"], antonyms: ["sophisticated", "mature"], difficulty: "advanced" },
  { word: "kowtow", definition: "Act in an excessively subservient manner", partOfSpeech: "verb", synonyms: ["grovel", "prostrate", "defer"], antonyms: ["dominate", "resist"], difficulty: "advanced" },
  { word: "lugubrious", definition: "Looking or sounding sad and dismal", partOfSpeech: "adjective", synonyms: ["mournful", "sorrowful", "melancholy"], antonyms: ["cheerful", "joyful"], difficulty: "advanced" },
  { word: "mendacious", definition: "Not telling the truth; lying", partOfSpeech: "adjective", synonyms: ["lying", "dishonest", "deceitful"], antonyms: ["truthful", "honest"], difficulty: "advanced" },
  { word: "nugatory", definition: "Having no purpose or value", partOfSpeech: "adjective", synonyms: ["worthless", "futile", "useless"], antonyms: ["valuable", "important"], difficulty: "advanced" },
  { word: "obdurate", definition: "Stubbornly refusing to change one's opinion or course of action", partOfSpeech: "adjective", synonyms: ["stubborn", "unyielding", "inflexible"], antonyms: ["flexible", "amenable"], difficulty: "advanced" },
  { word: "perfidious", definition: "Deceitful and untrustworthy", partOfSpeech: "adjective", synonyms: ["treacherous", "faithless", "disloyal"], antonyms: ["faithful", "loyal"], difficulty: "advanced" },
  { word: "quixotic", definition: "Exceedingly idealistic; unrealistic and impractical", partOfSpeech: "adjective", synonyms: ["idealistic", "romantic", "impractical"], antonyms: ["pragmatic", "realistic"], difficulty: "advanced" },
  { word: "recalcitrant", definition: "Having an obstinately uncooperative attitude", partOfSpeech: "adjective", synonyms: ["uncooperative", "defiant", "refractory"], antonyms: ["compliant", "obedient"], difficulty: "advanced" },
  { word: "sycophant", definition: "A person who acts obsequiously toward someone important", partOfSpeech: "noun", synonyms: ["flatterer", "toady", "yes-man"], antonyms: ["critic", "detractor"], difficulty: "advanced" },
  { word: "truculent", definition: "Eager or quick to argue or fight; aggressively defiant", partOfSpeech: "adjective", synonyms: ["aggressive", "belligerent", "combative"], antonyms: ["cooperative", "amiable"], difficulty: "advanced" },
  { word: "ubiquitous", definition: "Present, appearing, or found everywhere", partOfSpeech: "adjective", synonyms: ["omnipresent", "pervasive", "universal"], antonyms: ["rare", "scarce"], difficulty: "advanced" },
  { word: "vociferous", definition: "Vehement or clamorous", partOfSpeech: "adjective", synonyms: ["loud", "vehement", "clamorous"], antonyms: ["quiet", "silent"], difficulty: "advanced" },
  { word: "wanton", definition: "Deliberate and unprovoked", partOfSpeech: "adjective", synonyms: ["deliberate", "willful", "malicious"], antonyms: ["justified", "warranted"], difficulty: "advanced" },
];

export function getRandomCuratedWords(count: number, exclude: string[] = []): CuratedWord[] {
  const available = curatedWords.filter((w) => !exclude.includes(w.word));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
