import { type StateData } from "@/data/states";

export function generateStateContent(state: StateData): string {
  const statusDescriptions: Record<string, string> = {
    permitted:
      "permits high school athletes to participate in Name, Image, and Likeness (NIL) activities",
    prohibited:
      "does not currently permit high school athletes to participate in Name, Image, and Likeness (NIL) activities",
    limited:
      "has limited or restricted provisions for high school athletes regarding Name, Image, and Likeness (NIL) activities",
    unclear:
      "has an unclear or evolving position on high school athletes participating in Name, Image, and Likeness (NIL) activities",
  };

  const statusAdvice: Record<string, string> = {
    permitted: `Since ${state.name} permits NIL activity, high school athletes have the opportunity to monetize their personal brand while maintaining their eligibility. This includes earning money from social media sponsorships, personal appearances, autograph signings, and content creation. However, athletes must still adhere to certain restrictions designed to preserve the integrity of high school athletics.`,
    prohibited: `Because ${state.name} currently prohibits NIL activity for high school athletes, students must be careful not to engage in any activities that could jeopardize their eligibility. While this may change in the future as more states adopt NIL-friendly policies, athletes in ${state.name} should focus on building their brand and skills so they are ready to take advantage of NIL opportunities when they become available — whether through a change in state policy or upon enrollment in college.`,
    limited: `${state.name}'s limited NIL provisions mean that athletes and their families must carefully navigate the specific rules and restrictions in place. What is permissible in ${state.name} may be more narrow than in states that fully permit NIL activity. Athletes should work closely with their families, coaches, and potentially legal counsel to ensure any NIL activity complies with the current regulations.`,
    unclear: `The unclear status of NIL rules in ${state.name} creates uncertainty for athletes and families. While there may be opportunities, the lack of clear guidance from the state athletic association means that athletes should proceed with caution. Consulting with a qualified attorney who understands both state law and athletic association rules is strongly recommended before entering into any NIL agreements.`,
  };

  const nilTypes =
    state.status === "permitted"
      ? `
## Types of NIL Deals Available in ${state.name}

High school athletes in ${state.name} can explore several types of NIL opportunities:

**Social Media Sponsorships** — Brands pay athletes to promote products or services on Instagram, TikTok, YouTube, and other platforms. This is the most common type of NIL deal for high school athletes, as it leverages their existing following and engagement.

**Personal Appearances** — Athletes can be compensated for attending events, signings, camps, or clinics. This is particularly common for athletes in high-profile sports like football, basketball, and baseball.

**Autograph Signings** — Athletes can sell signed merchandise, photos, and memorabilia. While more common among college athletes, high school athletes with significant followings can also participate.

**Content Creation** — Athletes can create and monetize their own content, including YouTube videos, podcasts, blogs, and online courses. This provides long-term value as it builds a personal brand that extends beyond athletics.

**Brand Ambassadorships** — Longer-term partnerships with companies where the athlete represents the brand over a period of time. These deals often provide more stability and higher overall compensation.`
      : state.status === "limited"
        ? `
## What NIL Activity Is Available in ${state.name}

Due to ${state.name}'s limited NIL provisions, the types of deals available are more restricted than in states that fully permit NIL. Athletes should carefully review the specific rules set by the ${state.athleticAssociation} to understand exactly what types of NIL activity are allowed, and under what conditions.`
        : "";

  const restrictionsSection = `
## Common Restrictions in ${state.name}

Regardless of the overall NIL status, there are standard restrictions that apply across nearly every state:

**No School Branding** — Athletes cannot use their school's name, logo, mascot, colors, or any official branding in their NIL deals. This is a universal restriction designed to separate the athlete's personal brand from the institution.

**No Performance-Based Bonuses** — NIL deals cannot include bonuses tied to on-field performance, such as payments for scoring touchdowns, winning games, or achieving statistical milestones. This rule helps prevent the commercialization of high school game outcomes.

**No Professional Contracts** — Athletes cannot sign professional athletic contracts and maintain their high school eligibility. NIL deals are specifically for the use of an athlete's name, image, and likeness — not for professional athletic services.

${
  state.status === "permitted"
    ? `**Academic Standing** — Athletes must maintain their academic eligibility to participate in both athletics and NIL activities. Poor academic performance can jeopardize both.

**Time Restrictions** — NIL activities generally cannot take place during school practice, games, or official team events. Athletes must manage their NIL commitments around their academic and athletic schedules.`
    : ""
}`;

  const reportingSection =
    state.status === "permitted"
      ? `
## Reporting Requirements

In ${state.name}, the ${state.athleticAssociation} ${
          state.name === "California" || state.name === "Florida"
            ? "does not currently require athletes to report NIL deals"
            : "may require athletes to disclose NIL agreements"
        }. However, athletes and families should maintain thorough records of all NIL contracts, payments, and communications. This documentation is important for:

- Proving compliance with state and association rules
- Tax reporting purposes (all NIL income is taxable)
- Resolving any potential eligibility disputes
- Transitioning to college NIL programs, where reporting requirements may be stricter`
      : "";

  const penaltiesSection = `
## Penalties for Violations

${
    state.status === "prohibited"
      ? `In ${state.name}, athletes who engage in prohibited NIL activity risk losing their eligibility to compete in ${state.athleticAssociation}-sanctioned events. The ${state.athleticAssociation} has the authority to investigate potential violations and impose penalties including suspension from competition, forfeiture of games, and permanent loss of eligibility.`
      : state.status === "limited"
        ? `In ${state.name}, athletes who exceed the scope of permitted NIL activity may face eligibility consequences. The ${state.athleticAssociation} enforces its NIL rules and can impose penalties for violations, including suspension from competition and potential loss of eligibility.`
        : `While ${state.name} permits NIL activity, athletes who violate the specific rules — such as using school branding or accepting performance-based bonuses — can still face eligibility consequences. The ${state.athleticAssociation} has the authority to investigate violations and impose penalties.`
  }

Parents and athletes should understand that eligibility is the most valuable asset a high school athlete has. No NIL deal is worth risking the ability to compete, be recruited, or earn a college scholarship.`;

  const recentChanges = `
## Recent Changes and Pending Legislation

The NIL landscape for high school athletes is evolving rapidly across the country. ${
    state.status === "prohibited"
      ? `While ${state.name} currently prohibits high school NIL activity, legislative efforts and advocacy groups continue to push for change. Athletes and families should stay informed about potential policy updates from both the state legislature and the ${state.athleticAssociation}.`
      : state.status === "unclear"
        ? `${state.name}'s NIL rules remain a work in progress. Recent legislative efforts have attempted to clarify the rules, but significant ambiguity remains. Athletes and families should monitor developments from both the state legislature and the ${state.athleticAssociation} for updated guidance.`
        : state.status === "limited"
          ? `${state.name}'s limited NIL provisions may expand in the future as more states adopt comprehensive NIL frameworks. Legislative proposals and advocacy efforts could lead to broader NIL rights for high school athletes in ${state.name}.`
          : `${state.name} has already adopted a permissive approach to high school NIL, but the landscape continues to evolve. Federal legislation and changes to NCAA rules could further impact how NIL operates at the high school level. Athletes should stay informed about developments that could affect their rights and opportunities.`
  }

As of February 2026, there is growing momentum at the national level toward a federal NIL framework that could standardize rules across all states, providing more clarity and consistency for student-athletes.`;

  return `${state.name} ${statusDescriptions[state.status]}. The ${state.athleticAssociationFull} (${state.athleticAssociation}) governs high school athletics in the state, and its rules regarding NIL activity are defined under ${state.ruleCitation}.

## Understanding ${state.name}'s NIL Rules

${statusAdvice[state.status]}

The ${state.athleticAssociation} is the governing body for high school athletics in ${state.name}, overseeing eligibility, competition rules, and student-athlete welfare. ${
    state.status === "permitted"
      ? `The association has adapted its policies to allow NIL activity while maintaining the core principles of high school athletics — including fair play, academic priority, and the amateur status of student-athletes.`
      : state.status === "prohibited"
        ? `The association currently maintains strict amateurism rules that prevent athletes from profiting from their NIL while maintaining high school eligibility.`
        : state.status === "limited"
          ? `The association has established specific guidelines that permit limited NIL activity under certain conditions.`
          : `The association is in the process of clarifying its position on NIL activity.`
  }
${nilTypes}
${restrictionsSection}
${reportingSection}
${penaltiesSection}
${recentChanges}`;
}

export function generateFAQs(
  state: StateData
): { question: string; answer: string }[] {
  const faqs = [
    {
      question: `Can high school athletes in ${state.name} get paid for NIL deals?`,
      answer:
        state.status === "permitted"
          ? `Yes, high school athletes in ${state.name} can earn money from NIL deals. The ${state.athleticAssociation} permits athletes to monetize their name, image, and likeness through endorsements, social media sponsorships, appearances, and more — as long as they follow the association's guidelines.`
          : state.status === "prohibited"
            ? `No, high school athletes in ${state.name} cannot currently earn money from NIL deals. The ${state.athleticAssociation} maintains amateurism rules that prohibit athletes from profiting from their name, image, or likeness while maintaining eligibility.`
            : state.status === "limited"
              ? `${state.name} has limited NIL provisions for high school athletes. Some NIL activity may be permitted under specific conditions set by the ${state.athleticAssociation}, but the scope is more restricted than in states that fully permit NIL.`
              : `The status of NIL for high school athletes in ${state.name} is currently unclear. Recent legislative and regulatory changes have created ambiguity, and athletes should consult with legal counsel before pursuing NIL opportunities.`,
    },
    {
      question: `Can ${state.name} high school athletes use their school's logo in NIL deals?`,
      answer: `No. Across virtually all states, including ${state.name}, high school athletes cannot use their school's name, logo, mascot, or any official branding in their NIL deals. This restriction separates the athlete's personal brand from the school and protects the institution's intellectual property.`,
    },
    {
      question: `Will NIL deals affect my child's college eligibility in ${state.name}?`,
      answer: `High school NIL activity that complies with ${state.athleticAssociation} rules should not affect college eligibility. However, families should keep detailed records of all NIL agreements and consult with prospective colleges about their NIL policies. NCAA rules around NIL continue to evolve, so staying informed is important.`,
    },
    {
      question: `Do ${state.name} high school athletes need to pay taxes on NIL income?`,
      answer: `Yes. All NIL income is taxable regardless of the athlete's age. Parents of minor athletes should consult with a tax professional to understand reporting requirements, deductions, and estimated tax payments. NIL income is typically reported as self-employment income.`,
    },
    {
      question: `How can parents in ${state.name} help their athlete navigate NIL?`,
      answer: `Parents should educate themselves on ${state.athleticAssociation} rules, review all contracts before their athlete signs, consult with an attorney for significant deals, help manage finances and tax obligations, and ensure NIL activity doesn't interfere with academics or athletics. Building a personal brand on social media is a great first step regardless of your state's NIL status.`,
    },
  ];

  return faqs;
}
