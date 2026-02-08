export type NILStatus = "permitted" | "prohibited" | "limited" | "unclear";

export interface StateData {
  name: string;
  slug: string;
  abbreviation: string;
  status: NILStatus;
  athleticAssociation: string;
  athleticAssociationFull: string;
  ruleCitation: string;
  canDo: string[];
  cannotDo: string[];
  notes: string[];
  lastVerified: string;
  neighbors: string[];
  seoDescription: string;
}

export const states: StateData[] = [
  {
    name: "Alabama",
    slug: "alabama",
    abbreviation: "AL",
    status: "prohibited",
    athleticAssociation: "AHSAA",
    athleticAssociationFull: "Alabama High School Athletic Association",
    ruleCitation: "AHSAA Bylaws – Amateurism and Eligibility Rules",
    canDo: [
      "Maintain personal social media accounts",
      "Participate in non-athletic employment",
      "Accept awards and recognition from school events"
    ],
    cannotDo: [
      "Sign NIL deals or endorsement contracts",
      "Receive compensation for use of name, image, or likeness",
      "Accept payment or gifts tied to athletic performance",
      "Use school logos, mascots, or branding for personal gain",
      "Hire an agent or marketing representative while eligible"
    ],
    notes: [
      "Alabama does not currently permit high school NIL activity.",
      "The AHSAA maintains strict amateurism rules for eligibility.",
      "Legislative efforts have been discussed but no bill has passed as of 2026.",
      "Athletes risk losing eligibility if they engage in NIL activity."
    ],
    lastVerified: "February 2026",
    neighbors: ["florida", "georgia", "mississippi", "tennessee"],
    seoDescription: "Alabama prohibits high school NIL deals. Learn about AHSAA amateurism rules and what Alabama high school athletes can and cannot do regarding NIL."
  },
  {
    name: "Alaska",
    slug: "alaska",
    abbreviation: "AK",
    status: "permitted",
    athleticAssociation: "ASAA",
    athleticAssociationFull: "Alaska School Activities Association",
    ruleCitation: "ASAA Bylaws – Article 8: Eligibility",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and personal appearances",
      "Create and monetize personal content",
      "Work with NIL agencies or representatives"
    ],
    cannotDo: [
      "Use school logos, mascots, or official branding in NIL deals",
      "Accept performance-based bonuses tied to game outcomes",
      "Sign professional athletic contracts while maintaining eligibility",
      "Conduct NIL activities during school practice or game time",
      "Allow NIL deals to interfere with academic requirements"
    ],
    notes: [
      "Alaska permits high school athletes to earn NIL compensation.",
      "Athletes must still comply with all ASAA eligibility rules.",
      "No specific state legislation governs HS NIL — ASAA policy applies.",
      "Parents or guardians should review contracts for athletes under 18."
    ],
    lastVerified: "February 2026",
    neighbors: [],
    seoDescription: "Alaska permits high school NIL deals. Learn about ASAA rules and what Alaska high school athletes can do to earn NIL income legally."
  },
  {
    name: "Arizona",
    slug: "arizona",
    abbreviation: "AZ",
    status: "unclear",
    athleticAssociation: "AIA",
    athleticAssociationFull: "Arizona Interscholastic Association",
    ruleCitation: "AIA Bylaws – Article 14; HB 2672 (2024 Amendment)",
    canDo: [
      "Potentially sign NIL deals under the 2024 amendment",
      "Maintain personal social media accounts",
      "Engage in non-athletic employment and business ventures"
    ],
    cannotDo: [
      "Use school logos, mascots, or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility",
      "Guarantee clarity on enforcement — rules are still being interpreted"
    ],
    notes: [
      "Arizona's NIL landscape remains uncertain despite a 2024 amendment (HB 2672) intended to clarify athlete rights.",
      "The AIA has not issued comprehensive guidance on implementation.",
      "Athletes and families should proceed with caution and seek legal counsel.",
      "Further legislative action or AIA rulemaking may be needed for clarity.",
      "Some attorneys interpret current rules as permitting NIL, but enforcement is inconsistent."
    ],
    lastVerified: "February 2026",
    neighbors: ["california", "colorado", "nevada", "new-mexico", "utah"],
    seoDescription: "Arizona's high school NIL rules remain unclear despite a 2024 amendment. Learn about AIA guidelines and the current status of NIL for Arizona athletes."
  },
  {
    name: "Arkansas",
    slug: "arkansas",
    abbreviation: "AR",
    status: "limited",
    athleticAssociation: "AAA",
    athleticAssociationFull: "Arkansas Activities Association",
    ruleCitation: "AAA Bylaws – NIL Policy; Act 696 (2023)",
    canDo: [
      "Sign NIL deals after signing a National Letter of Intent (NLI) to an in-state school",
      "Earn NIL income once committed to an Arkansas college or university",
      "Monetize social media and personal brand after NLI signing"
    ],
    cannotDo: [
      "Sign NIL deals before signing an NLI to an in-state school",
      "Earn NIL income if committed to an out-of-state school",
      "Use school logos or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "Arkansas permits NIL only after an athlete signs an NLI to an in-state college.",
      "This is one of the most restrictive 'permitted' NIL policies in the country.",
      "Athletes committed to out-of-state programs do not qualify.",
      "The AAA oversees compliance and eligibility under this framework.",
      "Families should document all NIL agreements for compliance purposes."
    ],
    lastVerified: "February 2026",
    neighbors: ["louisiana", "mississippi", "missouri", "oklahoma", "tennessee", "texas"],
    seoDescription: "Arkansas limits high school NIL deals to athletes who have signed an NLI to an in-state school. Learn about AAA rules and restrictions."
  },
  {
    name: "California",
    slug: "california",
    abbreviation: "CA",
    status: "permitted",
    athleticAssociation: "CIF",
    athleticAssociationFull: "California Interscholastic Federation",
    ruleCitation: "CIF Bylaws – Bylaw 206; SB 206 (Fair Pay to Play Act)",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships and content creation",
      "Sell autographs and make paid personal appearances",
      "Hire an agent or marketing representative",
      "Monetize YouTube, TikTok, Instagram, and other platforms"
    ],
    cannotDo: [
      "Use school logos, mascots, or official branding in NIL deals",
      "Accept performance-based bonuses tied to athletic outcomes",
      "Sign professional athletic contracts while maintaining eligibility",
      "Allow NIL deals to conflict with team or school commitments",
      "Engage in NIL activity during school-sanctioned events"
    ],
    notes: [
      "California was the first state to pass an NIL law (SB 206, the Fair Pay to Play Act).",
      "The CIF permits NIL activity for high school athletes with minimal restrictions.",
      "Athletes under 18 should have a parent or guardian review all contracts.",
      "California is considered one of the most athlete-friendly states for NIL.",
      "No reporting requirements to the CIF for NIL deals."
    ],
    lastVerified: "February 2026",
    neighbors: ["arizona", "nevada", "oregon"],
    seoDescription: "California permits high school NIL deals under the Fair Pay to Play Act. Learn CIF rules and what California athletes can do to earn NIL income."
  },
  {
    name: "Colorado",
    slug: "colorado",
    abbreviation: "CO",
    status: "permitted",
    athleticAssociation: "CHSAA",
    athleticAssociationFull: "Colorado High School Activities Association",
    ruleCitation: "CHSAA Bylaws – Article 14; SB 20-123",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content",
      "Work with agents or NIL representatives"
    ],
    cannotDo: [
      "Use school logos, mascots, or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility",
      "Allow NIL to interfere with academic or team obligations"
    ],
    notes: [
      "Colorado permits high school NIL activity under state law.",
      "CHSAA has adopted policies allowing athlete compensation.",
      "Athletes should ensure contracts are reviewed by a parent or guardian.",
      "Colorado is considered one of the more progressive states for HS NIL."
    ],
    lastVerified: "February 2026",
    neighbors: ["arizona", "kansas", "nebraska", "new-mexico", "oklahoma", "utah", "wyoming"],
    seoDescription: "Colorado permits high school NIL deals. Learn about CHSAA rules and how Colorado athletes can legally earn NIL income."
  },
  {
    name: "Connecticut",
    slug: "connecticut",
    abbreviation: "CT",
    status: "permitted",
    athleticAssociation: "CIAC",
    athleticAssociationFull: "Connecticut Interscholastic Athletic Conference",
    ruleCitation: "CIAC Bylaws – Amateurism and Eligibility; HB 6539",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media and content creation",
      "Sell autographs and make paid appearances",
      "Monetize personal brand and likeness",
      "Work with agents or NIL platforms"
    ],
    cannotDo: [
      "Use school logos or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility",
      "Conduct NIL activity during school practices or games"
    ],
    notes: [
      "Connecticut permits high school athletes to earn NIL compensation.",
      "The CIAC updated its bylaws to accommodate NIL activity.",
      "Athletes under 18 must have parental or guardian oversight.",
      "No mandatory reporting of NIL deals to the CIAC."
    ],
    lastVerified: "February 2026",
    neighbors: ["massachusetts", "new-york", "rhode-island"],
    seoDescription: "Connecticut permits high school NIL deals. Learn about CIAC rules and what Connecticut athletes can do to earn NIL income."
  },
  {
    name: "Delaware",
    slug: "delaware",
    abbreviation: "DE",
    status: "permitted",
    athleticAssociation: "DIAA",
    athleticAssociationFull: "Delaware Interscholastic Athletic Association",
    ruleCitation: "DIAA Rules and Regulations – Eligibility Standards",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content"
    ],
    cannotDo: [
      "Use school logos or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "Delaware permits high school athletes to participate in NIL activity.",
      "DIAA eligibility rules apply — athletes must remain in good standing.",
      "Parents should review all contracts for minors."
    ],
    lastVerified: "February 2026",
    neighbors: ["maryland", "new-jersey", "pennsylvania"],
    seoDescription: "Delaware permits high school NIL deals. Learn about DIAA rules and what Delaware athletes can do to earn NIL income."
  },
  {
    name: "Florida",
    slug: "florida",
    abbreviation: "FL",
    status: "permitted",
    athleticAssociation: "FHSAA",
    athleticAssociationFull: "Florida High School Athletic Association",
    ruleCitation: "FHSAA Bylaws – Bylaw 9.4; SB 7044",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships and content creation",
      "Sell autographs and make paid personal appearances",
      "Hire an agent or NIL representative",
      "Monetize personal brand across all platforms",
      "Participate in NIL camps and clinics"
    ],
    cannotDo: [
      "Use school logos, mascots, or branding in NIL deals",
      "Accept performance-based bonuses tied to game results",
      "Sign professional contracts while maintaining eligibility",
      "Allow NIL to interfere with team or school schedule",
      "Use school facilities for NIL-related activities without permission"
    ],
    notes: [
      "Florida is one of the most active states for high school NIL opportunities.",
      "SB 7044 provides a strong legal framework for athlete compensation.",
      "The FHSAA has been proactive in establishing clear NIL guidelines.",
      "Florida's large athlete population makes it a major NIL market.",
      "Athletes under 18 should have parental oversight on all contracts."
    ],
    lastVerified: "February 2026",
    neighbors: ["alabama", "georgia"],
    seoDescription: "Florida permits high school NIL deals under SB 7044. Learn about FHSAA rules and how Florida athletes can earn NIL income."
  },
  {
    name: "Georgia",
    slug: "georgia",
    abbreviation: "GA",
    status: "permitted",
    athleticAssociation: "GHSA",
    athleticAssociationFull: "Georgia High School Association",
    ruleCitation: "GHSA Constitution – Bylaw 2.67; SB 401",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content",
      "Work with NIL agents or platforms"
    ],
    cannotDo: [
      "Use school logos, mascots, or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility",
      "Use NIL activity to recruit or be recruited in violation of GHSA rules"
    ],
    notes: [
      "Georgia permits high school NIL activity under state legislation.",
      "The GHSA updated its bylaws to allow NIL while preserving eligibility.",
      "Georgia has a robust high school sports culture and significant NIL potential.",
      "Families should keep records of all NIL agreements."
    ],
    lastVerified: "February 2026",
    neighbors: ["alabama", "florida", "north-carolina", "south-carolina", "tennessee"],
    seoDescription: "Georgia permits high school NIL deals. Learn about GHSA rules and how Georgia athletes can earn NIL income legally."
  },
  {
    name: "Hawaii",
    slug: "hawaii",
    abbreviation: "HI",
    status: "prohibited",
    athleticAssociation: "HHSAA",
    athleticAssociationFull: "Hawaii High School Athletic Association",
    ruleCitation: "HHSAA Rules – Amateurism and Eligibility",
    canDo: [
      "Maintain personal social media accounts",
      "Participate in non-athletic employment",
      "Accept school-sponsored awards and recognition"
    ],
    cannotDo: [
      "Sign NIL deals or endorsement contracts",
      "Receive compensation for use of name, image, or likeness",
      "Accept payment or gifts tied to athletic status",
      "Hire an agent or marketing representative while eligible"
    ],
    notes: [
      "Hawaii does not currently permit high school NIL activity.",
      "The HHSAA maintains traditional amateurism standards.",
      "No pending legislation as of early 2026.",
      "Athletes engaging in NIL activity risk losing eligibility."
    ],
    lastVerified: "February 2026",
    neighbors: [],
    seoDescription: "Hawaii prohibits high school NIL deals. Learn about HHSAA amateurism rules and eligibility requirements for Hawaii athletes."
  },
  {
    name: "Idaho",
    slug: "idaho",
    abbreviation: "ID",
    status: "permitted",
    athleticAssociation: "IHSAA",
    athleticAssociationFull: "Idaho High School Activities Association",
    ruleCitation: "IHSAA Rules – Eligibility; HB 384",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content"
    ],
    cannotDo: [
      "Use school logos or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "Idaho permits high school NIL activity.",
      "IHSAA eligibility rules still apply to all participating athletes.",
      "Parental oversight recommended for athletes under 18."
    ],
    lastVerified: "February 2026",
    neighbors: ["montana", "nevada", "oregon", "utah", "washington", "wyoming"],
    seoDescription: "Idaho permits high school NIL deals. Learn about IHSAA rules and what Idaho athletes can do to earn NIL income."
  },
  {
    name: "Illinois",
    slug: "illinois",
    abbreviation: "IL",
    status: "permitted",
    athleticAssociation: "IHSA",
    athleticAssociationFull: "Illinois High School Association",
    ruleCitation: "IHSA Bylaws – Section 4.042; SB 2338",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content",
      "Work with NIL agents or platforms"
    ],
    cannotDo: [
      "Use school logos, mascots, or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility",
      "Allow NIL activity to interfere with academic standing"
    ],
    notes: [
      "Illinois permits high school NIL activity under state legislation.",
      "The IHSA has established clear guidelines for athlete participation.",
      "Illinois has one of the larger high school athlete populations in the country.",
      "Athletes should maintain documentation of all NIL agreements."
    ],
    lastVerified: "February 2026",
    neighbors: ["indiana", "iowa", "kentucky", "missouri", "wisconsin"],
    seoDescription: "Illinois permits high school NIL deals. Learn about IHSA rules and how Illinois athletes can earn NIL income."
  },
  {
    name: "Indiana",
    slug: "indiana",
    abbreviation: "IN",
    status: "prohibited",
    athleticAssociation: "IHSAA",
    athleticAssociationFull: "Indiana High School Athletic Association",
    ruleCitation: "IHSAA Bylaws – Rule 19: Amateurism",
    canDo: [
      "Maintain personal social media accounts",
      "Participate in non-athletic employment",
      "Accept school-sponsored awards"
    ],
    cannotDo: [
      "Sign NIL deals or endorsement contracts",
      "Receive compensation for use of name, image, or likeness",
      "Accept payment or gifts tied to athletic status or performance",
      "Hire an agent or marketing representative while eligible"
    ],
    notes: [
      "Indiana does not permit high school NIL activity.",
      "The IHSAA enforces strict amateurism rules under Rule 19.",
      "Violations can result in loss of eligibility.",
      "Some legislative discussions have occurred but no bill has passed."
    ],
    lastVerified: "February 2026",
    neighbors: ["illinois", "kentucky", "michigan", "ohio"],
    seoDescription: "Indiana prohibits high school NIL deals. Learn about IHSAA amateurism rules and eligibility requirements for Indiana athletes."
  },
  {
    name: "Iowa",
    slug: "iowa",
    abbreviation: "IA",
    status: "permitted",
    athleticAssociation: "IHSAA/IGHSAU",
    athleticAssociationFull: "Iowa High School Athletic Association / Iowa Girls High School Athletic Union",
    ruleCitation: "IHSAA/IGHSAU Bylaws – Amateurism Standards; HF 2547",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content"
    ],
    cannotDo: [
      "Use school logos or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "Iowa permits high school NIL activity.",
      "Iowa uniquely has separate associations for boys (IHSAA) and girls (IGHSAU).",
      "Both associations have updated policies to allow NIL.",
      "Standard school-branding and amateurism restrictions apply."
    ],
    lastVerified: "February 2026",
    neighbors: ["illinois", "minnesota", "missouri", "nebraska", "south-dakota", "wisconsin"],
    seoDescription: "Iowa permits high school NIL deals. Learn about IHSAA/IGHSAU rules and what Iowa athletes can do to earn NIL income."
  },
  {
    name: "Kansas",
    slug: "kansas",
    abbreviation: "KS",
    status: "limited",
    athleticAssociation: "KSHSAA",
    athleticAssociationFull: "Kansas State High School Activities Association",
    ruleCitation: "KSHSAA Handbook – Rule 21: Amateur Standing",
    canDo: [
      "Earn money from non-athletic employment",
      "Receive limited NIL compensation under Rule 21 provisions",
      "Maintain personal social media accounts",
      "Accept awards from school-sanctioned events"
    ],
    cannotDo: [
      "Sign major endorsement contracts",
      "Use school logos or branding for personal profit",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility",
      "Engage in NIL activities that violate Rule 21 restrictions"
    ],
    notes: [
      "Kansas has a limited allowance for NIL under KSHSAA Rule 21.",
      "The scope of permissible activity is narrower than fully permitted states.",
      "Athletes and families should consult KSHSAA directly for specific guidance.",
      "Legislative developments could expand NIL rights in the future.",
      "Rule interpretation may vary — seek clarification before signing deals."
    ],
    lastVerified: "February 2026",
    neighbors: ["colorado", "missouri", "nebraska", "oklahoma"],
    seoDescription: "Kansas has limited high school NIL provisions under KSHSAA Rule 21. Learn what Kansas athletes can and cannot do for NIL deals."
  },
  {
    name: "Kentucky",
    slug: "kentucky",
    abbreviation: "KY",
    status: "permitted",
    athleticAssociation: "KHSAA",
    athleticAssociationFull: "Kentucky High School Athletic Association",
    ruleCitation: "KHSAA Bylaws – Eligibility; HB 367",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content",
      "Work with NIL agents or platforms"
    ],
    cannotDo: [
      "Use school logos, mascots, or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "Kentucky permits high school NIL activity.",
      "The KHSAA has adopted a permissive stance on athlete compensation.",
      "Athletes must maintain eligibility in all other respects.",
      "Parental oversight is recommended for minors."
    ],
    lastVerified: "February 2026",
    neighbors: ["illinois", "indiana", "ohio", "tennessee", "virginia", "west-virginia"],
    seoDescription: "Kentucky permits high school NIL deals. Learn about KHSAA rules and how Kentucky athletes can earn NIL income."
  },
  {
    name: "Louisiana",
    slug: "louisiana",
    abbreviation: "LA",
    status: "permitted",
    athleticAssociation: "LHSAA",
    athleticAssociationFull: "Louisiana High School Athletic Association",
    ruleCitation: "LHSAA Constitution – Amateurism; SB 60",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content",
      "Work with NIL platforms and agents"
    ],
    cannotDo: [
      "Use school logos, mascots, or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "Louisiana permits high school NIL activity under state law.",
      "The LHSAA has updated its constitution to accommodate NIL.",
      "Louisiana is a major football state with significant NIL opportunities.",
      "Athletes should keep records of all agreements for compliance."
    ],
    lastVerified: "February 2026",
    neighbors: ["arkansas", "mississippi", "texas"],
    seoDescription: "Louisiana permits high school NIL deals. Learn about LHSAA rules and how Louisiana athletes can earn NIL income."
  },
  {
    name: "Maine",
    slug: "maine",
    abbreviation: "ME",
    status: "permitted",
    athleticAssociation: "MPA",
    athleticAssociationFull: "Maine Principals' Association",
    ruleCitation: "MPA Handbook – Eligibility Standards",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content"
    ],
    cannotDo: [
      "Use school logos or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "Maine permits high school NIL activity.",
      "The MPA oversees eligibility and has adapted to allow NIL.",
      "Parental oversight is recommended for athletes under 18."
    ],
    lastVerified: "February 2026",
    neighbors: ["new-hampshire", "vermont"],
    seoDescription: "Maine permits high school NIL deals. Learn about MPA rules and what Maine athletes can do to earn NIL income."
  },
  {
    name: "Maryland",
    slug: "maryland",
    abbreviation: "MD",
    status: "permitted",
    athleticAssociation: "MPSSAA",
    athleticAssociationFull: "Maryland Public Secondary Schools Athletic Association",
    ruleCitation: "MPSSAA Handbook – Eligibility; HB 1183",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content",
      "Work with NIL agents or platforms"
    ],
    cannotDo: [
      "Use school logos, mascots, or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "Maryland permits high school NIL activity.",
      "The MPSSAA has established guidelines for NIL participation.",
      "Athletes in the D.C. metro area may have additional opportunities.",
      "All contracts for minors should be reviewed by a parent or guardian."
    ],
    lastVerified: "February 2026",
    neighbors: ["delaware", "pennsylvania", "virginia", "west-virginia", "washington-dc"],
    seoDescription: "Maryland permits high school NIL deals. Learn about MPSSAA rules and how Maryland athletes can earn NIL income."
  },
  {
    name: "Massachusetts",
    slug: "massachusetts",
    abbreviation: "MA",
    status: "permitted",
    athleticAssociation: "MIAA",
    athleticAssociationFull: "Massachusetts Interscholastic Athletic Association",
    ruleCitation: "MIAA Handbook – Rule 45: Amateurism",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content"
    ],
    cannotDo: [
      "Use school logos or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "Massachusetts permits high school NIL activity.",
      "The MIAA updated Rule 45 to accommodate NIL rights.",
      "Standard amateurism restrictions still apply."
    ],
    lastVerified: "February 2026",
    neighbors: ["connecticut", "new-hampshire", "new-york", "rhode-island", "vermont"],
    seoDescription: "Massachusetts permits high school NIL deals. Learn about MIAA rules and what Massachusetts athletes can do to earn NIL income."
  },
  {
    name: "Michigan",
    slug: "michigan",
    abbreviation: "MI",
    status: "prohibited",
    athleticAssociation: "MHSAA",
    athleticAssociationFull: "Michigan High School Athletic Association",
    ruleCitation: "MHSAA Handbook – Regulation I, Section 10: Amateurism",
    canDo: [
      "Maintain personal social media accounts",
      "Participate in non-athletic employment",
      "Accept school-sponsored awards and recognition"
    ],
    cannotDo: [
      "Sign NIL deals or endorsement contracts",
      "Receive compensation for use of name, image, or likeness",
      "Accept payment or gifts tied to athletic status",
      "Hire an agent or marketing representative while eligible"
    ],
    notes: [
      "Michigan does not currently permit high school NIL activity.",
      "The MHSAA maintains strict amateurism rules under Regulation I.",
      "Legislative efforts have been introduced but have not passed.",
      "Athletes risk losing eligibility if they engage in NIL deals."
    ],
    lastVerified: "February 2026",
    neighbors: ["indiana", "ohio", "wisconsin"],
    seoDescription: "Michigan prohibits high school NIL deals. Learn about MHSAA amateurism rules and eligibility requirements for Michigan athletes."
  },
  {
    name: "Minnesota",
    slug: "minnesota",
    abbreviation: "MN",
    status: "permitted",
    athleticAssociation: "MSHSL",
    athleticAssociationFull: "Minnesota State High School League",
    ruleCitation: "MSHSL Bylaws – Eligibility; SF 2307",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content"
    ],
    cannotDo: [
      "Use school logos or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "Minnesota permits high school NIL activity.",
      "The MSHSL has updated eligibility rules to accommodate NIL.",
      "Standard restrictions on school branding apply."
    ],
    lastVerified: "February 2026",
    neighbors: ["iowa", "north-dakota", "south-dakota", "wisconsin"],
    seoDescription: "Minnesota permits high school NIL deals. Learn about MSHSL rules and what Minnesota athletes can do to earn NIL income."
  },
  {
    name: "Mississippi",
    slug: "mississippi",
    abbreviation: "MS",
    status: "limited",
    athleticAssociation: "MHSAA",
    athleticAssociationFull: "Mississippi High School Activities Association",
    ruleCitation: "MHSAA Handbook – Amateurism and Eligibility Rules",
    canDo: [
      "Engage in very limited NIL activity under strict MHSAA oversight",
      "Maintain personal social media accounts",
      "Participate in non-athletic employment"
    ],
    cannotDo: [
      "Sign most endorsement or sponsorship contracts",
      "Use school logos or branding in any NIL activity",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility",
      "Engage in NIL activity without MHSAA awareness"
    ],
    notes: [
      "Mississippi has highly restricted NIL provisions for high school athletes.",
      "The MHSAA maintains significant control over what is permissible.",
      "Athletes should contact MHSAA directly before pursuing any NIL deals.",
      "Rules are more restrictive than most states that allow some form of NIL.",
      "Legislative changes could expand permissions in the future."
    ],
    lastVerified: "February 2026",
    neighbors: ["alabama", "arkansas", "louisiana", "tennessee"],
    seoDescription: "Mississippi has highly restricted high school NIL rules. Learn about MHSAA regulations and what Mississippi athletes can and cannot do."
  },
  {
    name: "Missouri",
    slug: "missouri",
    abbreviation: "MO",
    status: "limited",
    athleticAssociation: "MSHSAA",
    athleticAssociationFull: "Missouri State High School Activities Association",
    ruleCitation: "MSHSAA Bylaws – Article IV: Eligibility; HB 781",
    canDo: [
      "Engage in limited NIL activity under MSHSAA guidelines",
      "Earn money from non-athletic employment",
      "Maintain personal social media accounts"
    ],
    cannotDo: [
      "Sign major endorsement deals without MSHSAA compliance review",
      "Use school logos or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "Missouri has limited NIL provisions for high school athletes.",
      "MSHSAA oversees compliance and has specific guidelines.",
      "The scope of permissible NIL activity is narrower than fully permitted states.",
      "Families should verify specific activities with MSHSAA before proceeding.",
      "Legislative developments may expand NIL rights."
    ],
    lastVerified: "February 2026",
    neighbors: ["arkansas", "illinois", "iowa", "kansas", "kentucky", "nebraska", "oklahoma", "tennessee"],
    seoDescription: "Missouri has limited high school NIL provisions. Learn about MSHSAA rules and what Missouri athletes can and cannot do for NIL."
  },
  {
    name: "Montana",
    slug: "montana",
    abbreviation: "MT",
    status: "permitted",
    athleticAssociation: "MHSA",
    athleticAssociationFull: "Montana High School Association",
    ruleCitation: "MHSA Handbook – Eligibility Standards",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content"
    ],
    cannotDo: [
      "Use school logos or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "Montana permits high school NIL activity.",
      "The MHSA has updated policies to allow athlete compensation.",
      "Standard restrictions apply."
    ],
    lastVerified: "February 2026",
    neighbors: ["idaho", "north-dakota", "south-dakota", "wyoming"],
    seoDescription: "Montana permits high school NIL deals. Learn about MHSA rules and what Montana athletes can do to earn NIL income."
  },
  {
    name: "Nebraska",
    slug: "nebraska",
    abbreviation: "NE",
    status: "permitted",
    athleticAssociation: "NSAA",
    athleticAssociationFull: "Nebraska School Activities Association",
    ruleCitation: "NSAA Bylaws – Eligibility; LB 962",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content"
    ],
    cannotDo: [
      "Use school logos or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "Nebraska permits high school NIL activity under state legislation.",
      "The NSAA has established guidelines for athlete NIL participation.",
      "Standard school-branding restrictions apply."
    ],
    lastVerified: "February 2026",
    neighbors: ["colorado", "iowa", "kansas", "missouri", "south-dakota", "wyoming"],
    seoDescription: "Nebraska permits high school NIL deals. Learn about NSAA rules and how Nebraska athletes can earn NIL income."
  },
  {
    name: "Nevada",
    slug: "nevada",
    abbreviation: "NV",
    status: "permitted",
    athleticAssociation: "NIAA",
    athleticAssociationFull: "Nevada Interscholastic Activities Association",
    ruleCitation: "NIAA Bylaws – Eligibility; SB 354",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content",
      "Work with NIL agents or platforms"
    ],
    cannotDo: [
      "Use school logos, mascots, or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "Nevada permits high school NIL activity.",
      "The NIAA has adopted permissive NIL policies.",
      "Las Vegas area athletes may have significant NIL opportunities.",
      "Standard amateurism restrictions still apply."
    ],
    lastVerified: "February 2026",
    neighbors: ["arizona", "california", "idaho", "oregon", "utah"],
    seoDescription: "Nevada permits high school NIL deals. Learn about NIAA rules and how Nevada athletes can earn NIL income."
  },
  {
    name: "New Hampshire",
    slug: "new-hampshire",
    abbreviation: "NH",
    status: "permitted",
    athleticAssociation: "NHIAA",
    athleticAssociationFull: "New Hampshire Interscholastic Athletic Association",
    ruleCitation: "NHIAA Handbook – Eligibility Standards",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content"
    ],
    cannotDo: [
      "Use school logos or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "New Hampshire permits high school NIL activity.",
      "NHIAA eligibility rules still apply.",
      "Parental oversight recommended for minor athletes."
    ],
    lastVerified: "February 2026",
    neighbors: ["maine", "massachusetts", "vermont"],
    seoDescription: "New Hampshire permits high school NIL deals. Learn about NHIAA rules and what New Hampshire athletes can do to earn NIL income."
  },
  {
    name: "New Jersey",
    slug: "new-jersey",
    abbreviation: "NJ",
    status: "permitted",
    athleticAssociation: "NJSIAA",
    athleticAssociationFull: "New Jersey State Interscholastic Athletic Association",
    ruleCitation: "NJSIAA Bylaws – Article V: Eligibility; S3055",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content",
      "Work with NIL agents or platforms"
    ],
    cannotDo: [
      "Use school logos, mascots, or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "New Jersey permits high school NIL activity.",
      "The NJSIAA has updated its bylaws to accommodate NIL.",
      "New Jersey's proximity to major media markets creates opportunities.",
      "Standard restrictions apply."
    ],
    lastVerified: "February 2026",
    neighbors: ["delaware", "new-york", "pennsylvania"],
    seoDescription: "New Jersey permits high school NIL deals. Learn about NJSIAA rules and how New Jersey athletes can earn NIL income."
  },
  {
    name: "New Mexico",
    slug: "new-mexico",
    abbreviation: "NM",
    status: "permitted",
    athleticAssociation: "NMAA",
    athleticAssociationFull: "New Mexico Activities Association",
    ruleCitation: "NMAA Handbook – Eligibility Rules",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content"
    ],
    cannotDo: [
      "Use school logos or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "New Mexico permits high school NIL activity.",
      "NMAA eligibility rules continue to apply.",
      "Standard school-branding restrictions are in effect."
    ],
    lastVerified: "February 2026",
    neighbors: ["arizona", "colorado", "oklahoma", "texas", "utah"],
    seoDescription: "New Mexico permits high school NIL deals. Learn about NMAA rules and what New Mexico athletes can do to earn NIL income."
  },
  {
    name: "New York",
    slug: "new-york",
    abbreviation: "NY",
    status: "permitted",
    athleticAssociation: "NYSPHSAA",
    athleticAssociationFull: "New York State Public High School Athletic Association",
    ruleCitation: "NYSPHSAA Handbook – Eligibility Standards; S6722",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content",
      "Work with NIL agents or platforms"
    ],
    cannotDo: [
      "Use school logos, mascots, or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "New York permits high school NIL activity.",
      "NYSPHSAA has updated its handbook to allow athlete compensation.",
      "New York City and other metro areas offer significant NIL opportunities.",
      "Athletes must maintain academic eligibility."
    ],
    lastVerified: "February 2026",
    neighbors: ["connecticut", "massachusetts", "new-jersey", "pennsylvania", "vermont"],
    seoDescription: "New York permits high school NIL deals. Learn about NYSPHSAA rules and how New York athletes can earn NIL income."
  },
  {
    name: "North Carolina",
    slug: "north-carolina",
    abbreviation: "NC",
    status: "permitted",
    athleticAssociation: "NCHSAA",
    athleticAssociationFull: "North Carolina High School Athletic Association",
    ruleCitation: "NCHSAA Handbook – Eligibility; HB 91",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content",
      "Work with NIL agents or platforms"
    ],
    cannotDo: [
      "Use school logos, mascots, or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "North Carolina permits high school NIL activity.",
      "The NCHSAA has adopted guidelines for athlete NIL participation.",
      "North Carolina has a strong high school sports tradition.",
      "Standard school-branding restrictions apply."
    ],
    lastVerified: "February 2026",
    neighbors: ["georgia", "south-carolina", "tennessee", "virginia"],
    seoDescription: "North Carolina permits high school NIL deals. Learn about NCHSAA rules and how North Carolina athletes can earn NIL income."
  },
  {
    name: "North Dakota",
    slug: "north-dakota",
    abbreviation: "ND",
    status: "permitted",
    athleticAssociation: "NDHSAA",
    athleticAssociationFull: "North Dakota High School Activities Association",
    ruleCitation: "NDHSAA Bylaws – Eligibility Standards",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content"
    ],
    cannotDo: [
      "Use school logos or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "North Dakota permits high school NIL activity.",
      "NDHSAA eligibility rules apply.",
      "Standard restrictions are in effect."
    ],
    lastVerified: "February 2026",
    neighbors: ["minnesota", "montana", "south-dakota"],
    seoDescription: "North Dakota permits high school NIL deals. Learn about NDHSAA rules and what North Dakota athletes can do to earn NIL income."
  },
  {
    name: "Ohio",
    slug: "ohio",
    abbreviation: "OH",
    status: "prohibited",
    athleticAssociation: "OHSAA",
    athleticAssociationFull: "Ohio High School Athletic Association",
    ruleCitation: "OHSAA Bylaws – Bylaw 4-4-1: Amateurism",
    canDo: [
      "Maintain personal social media accounts",
      "Participate in non-athletic employment",
      "Accept school-sponsored awards and recognition"
    ],
    cannotDo: [
      "Sign NIL deals or endorsement contracts",
      "Receive compensation for use of name, image, or likeness",
      "Accept payment or gifts tied to athletic status or performance",
      "Hire an agent or marketing representative while eligible"
    ],
    notes: [
      "Ohio does not currently permit high school NIL activity.",
      "The OHSAA enforces strict amateurism standards under Bylaw 4-4-1.",
      "Ohio has one of the largest high school athlete populations in the country.",
      "Legislative efforts have been discussed but no comprehensive bill has passed.",
      "Athletes engaging in NIL activity risk losing OHSAA eligibility."
    ],
    lastVerified: "February 2026",
    neighbors: ["indiana", "kentucky", "michigan", "pennsylvania", "west-virginia"],
    seoDescription: "Ohio prohibits high school NIL deals. Learn about OHSAA amateurism rules and eligibility requirements for Ohio athletes."
  },
  {
    name: "Oklahoma",
    slug: "oklahoma",
    abbreviation: "OK",
    status: "permitted",
    athleticAssociation: "OSSAA",
    athleticAssociationFull: "Oklahoma Secondary School Activities Association",
    ruleCitation: "OSSAA Rules – Eligibility; SB 840",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content",
      "Work with NIL agents or platforms"
    ],
    cannotDo: [
      "Use school logos, mascots, or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "Oklahoma permits high school NIL activity under state legislation.",
      "OSSAA has established clear guidelines for NIL participation.",
      "Oklahoma has a strong football and wrestling culture with NIL potential.",
      "Standard restrictions apply."
    ],
    lastVerified: "February 2026",
    neighbors: ["arkansas", "colorado", "kansas", "missouri", "new-mexico", "texas"],
    seoDescription: "Oklahoma permits high school NIL deals. Learn about OSSAA rules and how Oklahoma athletes can earn NIL income."
  },
  {
    name: "Oregon",
    slug: "oregon",
    abbreviation: "OR",
    status: "permitted",
    athleticAssociation: "OSAA",
    athleticAssociationFull: "Oregon School Activities Association",
    ruleCitation: "OSAA Handbook – Eligibility; SB 1503",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content"
    ],
    cannotDo: [
      "Use school logos or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "Oregon permits high school NIL activity.",
      "OSAA has adapted its eligibility rules to allow NIL.",
      "Standard restrictions apply."
    ],
    lastVerified: "February 2026",
    neighbors: ["california", "idaho", "nevada", "washington"],
    seoDescription: "Oregon permits high school NIL deals. Learn about OSAA rules and what Oregon athletes can do to earn NIL income."
  },
  {
    name: "Pennsylvania",
    slug: "pennsylvania",
    abbreviation: "PA",
    status: "permitted",
    athleticAssociation: "PIAA",
    athleticAssociationFull: "Pennsylvania Interscholastic Athletic Association",
    ruleCitation: "PIAA Bylaws – Article VI: Eligibility; HB 1147",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content",
      "Work with NIL agents or platforms"
    ],
    cannotDo: [
      "Use school logos, mascots, or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "Pennsylvania permits high school NIL activity.",
      "The PIAA has updated its bylaws to accommodate NIL.",
      "Pennsylvania has a large high school athlete population.",
      "Standard restrictions apply."
    ],
    lastVerified: "February 2026",
    neighbors: ["delaware", "maryland", "new-jersey", "new-york", "ohio", "west-virginia"],
    seoDescription: "Pennsylvania permits high school NIL deals. Learn about PIAA rules and how Pennsylvania athletes can earn NIL income."
  },
  {
    name: "Rhode Island",
    slug: "rhode-island",
    abbreviation: "RI",
    status: "permitted",
    athleticAssociation: "RIIL",
    athleticAssociationFull: "Rhode Island Interscholastic League",
    ruleCitation: "RIIL Handbook – Eligibility Standards",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content"
    ],
    cannotDo: [
      "Use school logos or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "Rhode Island permits high school NIL activity.",
      "RIIL eligibility standards continue to apply.",
      "Standard restrictions are in effect."
    ],
    lastVerified: "February 2026",
    neighbors: ["connecticut", "massachusetts"],
    seoDescription: "Rhode Island permits high school NIL deals. Learn about RIIL rules and what Rhode Island athletes can do to earn NIL income."
  },
  {
    name: "South Carolina",
    slug: "south-carolina",
    abbreviation: "SC",
    status: "permitted",
    athleticAssociation: "SCHSL",
    athleticAssociationFull: "South Carolina High School League",
    ruleCitation: "SCHSL Bylaws – Eligibility; S 685",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content",
      "Work with NIL agents or platforms"
    ],
    cannotDo: [
      "Use school logos, mascots, or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "South Carolina permits high school NIL activity.",
      "The SCHSL has adopted NIL-friendly policies.",
      "South Carolina has a strong high school football culture with NIL potential.",
      "Standard restrictions apply."
    ],
    lastVerified: "February 2026",
    neighbors: ["georgia", "north-carolina"],
    seoDescription: "South Carolina permits high school NIL deals. Learn about SCHSL rules and how South Carolina athletes can earn NIL income."
  },
  {
    name: "South Dakota",
    slug: "south-dakota",
    abbreviation: "SD",
    status: "permitted",
    athleticAssociation: "SDHSAA",
    athleticAssociationFull: "South Dakota High School Activities Association",
    ruleCitation: "SDHSAA Bylaws – Eligibility Standards",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content"
    ],
    cannotDo: [
      "Use school logos or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "South Dakota permits high school NIL activity.",
      "SDHSAA eligibility rules apply.",
      "Standard restrictions are in effect."
    ],
    lastVerified: "February 2026",
    neighbors: ["iowa", "minnesota", "montana", "nebraska", "north-dakota", "wyoming"],
    seoDescription: "South Dakota permits high school NIL deals. Learn about SDHSAA rules and what South Dakota athletes can do to earn NIL income."
  },
  {
    name: "Tennessee",
    slug: "tennessee",
    abbreviation: "TN",
    status: "permitted",
    athleticAssociation: "TSSAA",
    athleticAssociationFull: "Tennessee Secondary School Athletic Association",
    ruleCitation: "TSSAA Bylaws – Eligibility; SB 1671",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content",
      "Work with NIL agents or platforms"
    ],
    cannotDo: [
      "Use school logos, mascots, or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "Tennessee permits high school NIL activity under state legislation.",
      "The TSSAA has adopted clear NIL guidelines.",
      "Tennessee has a strong football tradition with significant NIL potential.",
      "Standard restrictions apply."
    ],
    lastVerified: "February 2026",
    neighbors: ["alabama", "arkansas", "georgia", "kentucky", "mississippi", "missouri", "north-carolina", "virginia"],
    seoDescription: "Tennessee permits high school NIL deals. Learn about TSSAA rules and how Tennessee athletes can earn NIL income."
  },
  {
    name: "Texas",
    slug: "texas",
    abbreviation: "TX",
    status: "limited",
    athleticAssociation: "UIL",
    athleticAssociationFull: "University Interscholastic League",
    ruleCitation: "UIL Constitution – Section 441; HB 2804",
    canDo: [
      "Seniors (17+) can sign NIL deals but payment is deferred until college enrollment",
      "Maintain personal social media accounts",
      "Participate in non-athletic employment",
      "Build personal brand and content for future monetization"
    ],
    cannotDo: [
      "Receive NIL payment while still enrolled in high school",
      "Use school logos, mascots, or UIL branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining UIL eligibility",
      "Underclassmen (under 17) cannot sign NIL deals at all"
    ],
    notes: [
      "Texas has a unique NIL framework: seniors 17+ can sign deals but cannot receive payment until they enroll in college.",
      "The UIL maintains strict oversight and eligibility requirements.",
      "Texas high school sports (especially football) represent one of the largest potential NIL markets in the country.",
      "Payment deferral means athletes sign agreements now but get paid later.",
      "This makes Texas technically 'limited' rather than fully permitted.",
      "The UIL has faced pressure to further liberalize NIL rules."
    ],
    lastVerified: "February 2026",
    neighbors: ["arkansas", "louisiana", "new-mexico", "oklahoma"],
    seoDescription: "Texas limits high school NIL deals — seniors 17+ can sign but payment is deferred until college. Learn about UIL rules and restrictions."
  },
  {
    name: "Utah",
    slug: "utah",
    abbreviation: "UT",
    status: "permitted",
    athleticAssociation: "UHSAA",
    athleticAssociationFull: "Utah High School Activities Association",
    ruleCitation: "UHSAA Handbook – Eligibility; HB 261",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content"
    ],
    cannotDo: [
      "Use school logos or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "Utah permits high school NIL activity.",
      "UHSAA has adapted its rules to allow athlete compensation.",
      "Standard restrictions apply."
    ],
    lastVerified: "February 2026",
    neighbors: ["arizona", "colorado", "idaho", "nevada", "new-mexico", "wyoming"],
    seoDescription: "Utah permits high school NIL deals. Learn about UHSAA rules and what Utah athletes can do to earn NIL income."
  },
  {
    name: "Vermont",
    slug: "vermont",
    abbreviation: "VT",
    status: "permitted",
    athleticAssociation: "VPA",
    athleticAssociationFull: "Vermont Principals' Association",
    ruleCitation: "VPA Handbook – Eligibility Standards",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content"
    ],
    cannotDo: [
      "Use school logos or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "Vermont permits high school NIL activity.",
      "VPA eligibility rules continue to apply.",
      "Standard restrictions are in effect."
    ],
    lastVerified: "February 2026",
    neighbors: ["maine", "massachusetts", "new-hampshire", "new-york"],
    seoDescription: "Vermont permits high school NIL deals. Learn about VPA rules and what Vermont athletes can do to earn NIL income."
  },
  {
    name: "Virginia",
    slug: "virginia",
    abbreviation: "VA",
    status: "permitted",
    athleticAssociation: "VHSL",
    athleticAssociationFull: "Virginia High School League",
    ruleCitation: "VHSL Handbook – Eligibility; HB 1608",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content",
      "Work with NIL agents or platforms"
    ],
    cannotDo: [
      "Use school logos, mascots, or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "Virginia permits high school NIL activity under state legislation.",
      "The VHSL has adopted clear NIL guidelines.",
      "Virginia's proximity to D.C. creates additional opportunities.",
      "Standard restrictions apply."
    ],
    lastVerified: "February 2026",
    neighbors: ["kentucky", "maryland", "north-carolina", "tennessee", "west-virginia", "washington-dc"],
    seoDescription: "Virginia permits high school NIL deals. Learn about VHSL rules and how Virginia athletes can earn NIL income."
  },
  {
    name: "Washington",
    slug: "washington",
    abbreviation: "WA",
    status: "permitted",
    athleticAssociation: "WIAA",
    athleticAssociationFull: "Washington Interscholastic Activities Association",
    ruleCitation: "WIAA Handbook – Eligibility; HB 1084",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content",
      "Work with NIL agents or platforms"
    ],
    cannotDo: [
      "Use school logos, mascots, or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "Washington permits high school NIL activity.",
      "WIAA has updated its handbook to accommodate NIL.",
      "Washington has significant NIL potential in the Seattle metro area.",
      "Standard restrictions apply."
    ],
    lastVerified: "February 2026",
    neighbors: ["idaho", "oregon"],
    seoDescription: "Washington permits high school NIL deals. Learn about WIAA rules and how Washington athletes can earn NIL income."
  },
  {
    name: "West Virginia",
    slug: "west-virginia",
    abbreviation: "WV",
    status: "permitted",
    athleticAssociation: "WVSSAC",
    athleticAssociationFull: "West Virginia Secondary School Activities Commission",
    ruleCitation: "WVSSAC Handbook – Eligibility; SB 238",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content"
    ],
    cannotDo: [
      "Use school logos or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "West Virginia permits high school NIL activity.",
      "WVSSAC has adopted NIL-friendly policies.",
      "Standard restrictions apply."
    ],
    lastVerified: "February 2026",
    neighbors: ["kentucky", "maryland", "ohio", "pennsylvania", "virginia"],
    seoDescription: "West Virginia permits high school NIL deals. Learn about WVSSAC rules and what West Virginia athletes can do to earn NIL income."
  },
  {
    name: "Wisconsin",
    slug: "wisconsin",
    abbreviation: "WI",
    status: "permitted",
    athleticAssociation: "WIAA",
    athleticAssociationFull: "Wisconsin Interscholastic Athletic Association",
    ruleCitation: "WIAA Handbook – Rules of Eligibility; AB 439",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content"
    ],
    cannotDo: [
      "Use school logos or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "Wisconsin permits high school NIL activity.",
      "The WIAA has updated its rules of eligibility to allow NIL.",
      "Standard restrictions apply."
    ],
    lastVerified: "February 2026",
    neighbors: ["illinois", "iowa", "michigan", "minnesota"],
    seoDescription: "Wisconsin permits high school NIL deals. Learn about WIAA rules and what Wisconsin athletes can do to earn NIL income."
  },
  {
    name: "Wyoming",
    slug: "wyoming",
    abbreviation: "WY",
    status: "permitted",
    athleticAssociation: "WHSAA",
    athleticAssociationFull: "Wyoming High School Activities Association",
    ruleCitation: "WHSAA Bylaws – Eligibility Standards",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content"
    ],
    cannotDo: [
      "Use school logos or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "Wyoming permits high school NIL activity.",
      "WHSAA eligibility rules apply.",
      "Standard restrictions are in effect."
    ],
    lastVerified: "February 2026",
    neighbors: ["colorado", "idaho", "montana", "nebraska", "south-dakota", "utah"],
    seoDescription: "Wyoming permits high school NIL deals. Learn about WHSAA rules and what Wyoming athletes can do to earn NIL income."
  },
  {
    name: "Washington D.C.",
    slug: "washington-dc",
    abbreviation: "DC",
    status: "permitted",
    athleticAssociation: "DCIAA",
    athleticAssociationFull: "District of Columbia Interscholastic Athletic Association",
    ruleCitation: "DCIAA Guidelines – Eligibility Standards",
    canDo: [
      "Sign NIL deals and endorsement contracts",
      "Earn money from social media sponsorships",
      "Sell autographs and make paid appearances",
      "Create and monetize personal content",
      "Work with NIL agents or platforms"
    ],
    cannotDo: [
      "Use school logos, mascots, or branding in NIL deals",
      "Accept performance-based bonuses",
      "Sign professional contracts while maintaining eligibility"
    ],
    notes: [
      "Washington D.C. permits high school NIL activity.",
      "The DCIAA has adopted guidelines allowing athlete compensation.",
      "D.C.'s unique position as the nation's capital creates media and brand opportunities.",
      "Athletes benefit from proximity to national media outlets and political figures.",
      "Standard restrictions apply."
    ],
    lastVerified: "February 2026",
    neighbors: ["maryland", "virginia"],
    seoDescription: "Washington D.C. permits high school NIL deals. Learn about DCIAA rules and how D.C. athletes can earn NIL income."
  }
];

// Helper functions
export function getStateBySlug(slug: string): StateData | undefined {
  return states.find((s) => s.slug === slug);
}

export function getStatesByStatus(status: NILStatus): StateData[] {
  return states.filter((s) => s.status === status);
}

export function getAllSlugs(): string[] {
  return states.map((s) => s.slug);
}

export function getStatusCounts(): Record<NILStatus, number> {
  return {
    permitted: states.filter((s) => s.status === "permitted").length,
    prohibited: states.filter((s) => s.status === "prohibited").length,
    limited: states.filter((s) => s.status === "limited").length,
    unclear: states.filter((s) => s.status === "unclear").length,
  };
}

export function getStatusColor(status: NILStatus): string {
  const colors: Record<NILStatus, string> = {
    permitted: "#059669",
    prohibited: "#DC2626",
    limited: "#D97706",
    unclear: "#7C3AED",
  };
  return colors[status];
}

export function getStatusLabel(status: NILStatus): string {
  const labels: Record<NILStatus, string> = {
    permitted: "Permitted",
    prohibited: "Prohibited",
    limited: "Limited",
    unclear: "Unclear",
  };
  return labels[status];
}
