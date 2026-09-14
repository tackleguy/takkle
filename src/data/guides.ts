export interface Guide {
  slug: string;
  title: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  publishedDate: string;
  updatedDate: string;
  emailCTA: {
    headline: string;
    description: string;
  };
  toc: { id: string; title: string }[];
  content: string;
}

export const guides: Guide[] = [
  {
    slug: "how-to-get-nil-deals-college",
    title: "How to Get NIL Deals as a College Athlete: Step-by-Step Guide",
    description:
      "A complete guide for college football athletes on landing NIL deals — from building your brand to signing your first contract.",
    seoTitle: "How to Get NIL Deals as a College Athlete (2026 Guide) | Takkle",
    seoDescription:
      "Step-by-step guide for college athletes to get NIL deals. Learn how to build your brand, work with collectives, and sign your first NIL contract.",
    publishedDate: "2026-01-15",
    updatedDate: "2026-09-14",
    emailCTA: {
      headline: "Download the NIL Deal Starter Kit",
      description:
        "Get our free PDF with templates, pitch examples, and a checklist for landing your first NIL deal.",
    },
    toc: [
      { id: "what-is-nil", title: "What Is NIL and Why Does It Matter?" },
      { id: "know-the-rules", title: "Step 1: Know NCAA + School Rules" },
      { id: "build-your-brand", title: "Step 2: Build Your Personal Brand" },
      { id: "grow-social-media", title: "Step 3: Grow Your Social Media" },
      { id: "find-opportunities", title: "Step 4: Find NIL Opportunities" },
      { id: "evaluate-deals", title: "Step 5: Evaluate and Negotiate Deals" },
      { id: "sign-the-deal", title: "Step 6: Sign the Deal" },
      { id: "manage-your-nil", title: "Step 7: Manage Your NIL Business" },
      { id: "common-mistakes", title: "Common Mistakes to Avoid" },
      { id: "conclusion", title: "Conclusion" },
    ],
    content: `Name, Image, and Likeness (NIL) is now core to college athletics. FBS and FCS athletes can earn from sponsorships, appearances, content, and institutional or collective partnerships — while still competing. Navigating NIL as a college athlete means balancing deals with eligibility, academics, and compliance.

This guide breaks down the process so you can go from zero NIL deals to your first signed contract.

## What Is NIL and Why Does It Matter?

NIL stands for Name, Image, and Likeness. It refers to an athlete's right to earn money from their personal brand — name, face, reputation, and content. That can include social media sponsorships, product endorsements, paid appearances, autograph signings, camps, and collective-facilitated opportunities.

For college athletes, NIL is not only income. It builds entrepreneurship, marketing, and personal-finance skills that travel with you after your eligibility ends. Estimate remaining seasons with the [College Eligibility Calculator](/college) so you plan deals around your clock.

## Step 1: Know NCAA + School Rules

Before pursuing any opportunity, understand what your school and conference require. College NIL is national in structure, but compliance is local.

Confirm disclosure requirements with your compliance office, whether deals need pre-approval, prohibited categories (gambling, alcohol, tobacco, adult content, and school-specific bans), and how jersey, logo, or facility use is restricted. Institutional marks almost always need separate permission.

If you are transferring or switching teams, ask how pending deals interact with new-school policies. When in doubt, disclose early.

## Step 2: Build Your Personal Brand

Your personal brand is what makes brands and collectives want to work with you.

**Define your identity.** What makes you unique beyond football? Academics, community work, film, or a niche hobby can differentiate you in a crowded roster.

**Create a consistent image.** Same profile photo, handle, and bio across platforms. Recruiters and brands research you in minutes.

**Tell your story.** Share the work, setbacks, and wins. Authenticity beats polished but empty highlight reels.

**Stay professional.** Everything online is part of your brand and your eligibility file. Controversial posts can kill deals and raise compliance flags.

## Step 3: Grow Your Social Media

Social media is the primary vehicle for most college NIL deals. Brands look at following, engagement, and content quality.

**Choose platforms wisely.** Focus on 1–2 platforms done well. Instagram and TikTok drive most athlete deals; LinkedIn and X help for certain categories.

**Post consistently.** A steady cadence beats occasional viral spikes. Training content, day-in-the-life, and community posts perform well.

**Engage your audience.** Reply to comments and DMs. Engagement rate often matters more than raw follower count.

**Track metrics.** Know your reach, saves, and average views so you can price deals with real data.

## Step 4: Find NIL Opportunities

**School / collective pathways.** Many programs connect athletes to local brands and collectives. Introduce yourself to NIL staff early.

**Direct brand outreach.** Local restaurants, gyms, apparel, and regional companies still close deals with athletes who pitch professionally.

**Platforms and marketplaces.** NIL marketplaces can surface offers — still run every deal through compliance.

**Camps and clinics.** Hosting or guesting at camps can be lucrative if your school allows it and you disclose properly.

**Content creators and agencies.** Some athletes partner with managers or agencies. Vet fees, exclusivity, and termination carefully.

## Step 5: Evaluate and Negotiate Deals

Not every offer is a good offer. Evaluate compensation vs. deliverables, exclusivity scope, usage rights for your name and image, payment timing, and how the deal sits with school rules.

Use our [NIL contract red flags guide](/guides/red-flags-nil-contracts) before you sign. For larger deals, get an attorney or trusted advisor review.

## Step 6: Sign the Deal

Read every page. Confirm deliverables, dates, payment, and termination. Disclose to compliance as required. Keep signed copies and payment confirmations.

## Step 7: Manage Your NIL Business

Treat NIL like a small business: track income and expenses, set aside money for taxes, deliver on time, and protect your brand. See [NIL taxes for college athletes](/guides/nil-taxes-for-college-athletes).

## Common Mistakes to Avoid

**Skipping compliance.** Undisclosed deals can cost eligibility.

**Undervaluing exclusivity.** Broad category exclusivity can block better offers later.

**Ignoring taxes.** NIL income is taxable; plan quarterly payments.

**Over-committing during season.** Protect practice, class, and recovery time.

**Going it alone on big deals.** Use compliance, advisors, and legal review when stakes rise.

## Conclusion

Getting NIL deals as a college athlete takes preparation, professionalism, and patience. Know your school rules, build an authentic brand, grow your audience, and approach every contract like a business decision.

NIL is a marathon across your eligibility window. Use Takkle to [claim your profile](/onboarding), check [eligibility](/college), and browse more [Player Guides](/guides).`,
  },
  {
    slug: "nil-taxes-for-college-athletes",
    title: "NIL Taxes for College Athletes: What You Need to Know",
    description:
      "A practical guide to tax obligations for college athletes earning NIL income — reporting, deductions, quarterly payments, and record-keeping.",
    seoTitle: "NIL Taxes for College Athletes (2026 Guide) | Takkle",
    seoDescription:
      "Complete guide to NIL taxes for college athletes. Learn about self-employment tax, deductions, quarterly payments, and filing requirements.",
    publishedDate: "2026-01-20",
    updatedDate: "2026-09-14",
    emailCTA: {
      headline: "Download the NIL Tax Checklist",
      description:
        "Get our free PDF checklist covering everything you need to track for NIL taxes.",
    },
    toc: [
      { id: "nil-income-taxable", title: "Is NIL Income Taxable?" },
      { id: "types-of-nil-income", title: "Types of NIL Income" },
      { id: "self-employment-tax", title: "Self-Employment Tax Explained" },
      { id: "deductions", title: "Deductions and Write-Offs" },
      { id: "quarterly-payments", title: "Quarterly Estimated Tax Payments" },
      { id: "filing-requirements", title: "Filing Requirements" },
      { id: "record-keeping", title: "Record-Keeping Best Practices" },
      { id: "when-to-get-help", title: "When to Hire a Tax Professional" },
      { id: "state-taxes", title: "State Tax Considerations" },
      { id: "conclusion", title: "Conclusion" },
    ],
    content: `You just signed your first NIL deal. Congrats — now plan for taxes. NIL income is fully taxable, and getting ahead of it prevents penalties and April surprises.

This guide covers what college athletes need to know about NIL taxes.

## Is NIL Income Taxable?

Yes. All NIL income is taxable by the IRS. Scholarship aid and NIL are different animals; deal income is generally treated as earned self-employment income when you are paid as an independent contractor.

Most brands and collectives do not withhold taxes. You are responsible for reporting income and paying what you owe.

## Types of NIL Income

**Cash payments** from sponsorships, endorsements, appearances, and autograph signings.

**Products and merchandise** at fair market value when received in exchange for promotion.

**Gift cards** at face value.

**Services** (training, travel perks, production support) at fair market value when they are compensation.

**Trips and experiences** paid by a brand as part of a deal.

Rule of thumb: if you received value for your NIL, assume it is reportable unless a tax pro says otherwise.

## Self-Employment Tax Explained

Independent-contractor NIL income is usually subject to self-employment tax (Social Security and Medicare, combined 15.3% on net earnings) in addition to income tax. Half of the self-employment tax is typically deductible when calculating adjusted gross income.

Self-employment tax generally kicks in once net self-employment earnings exceed $400 in a year — so even smaller deals can create a filing obligation.

## Deductions and Write-Offs

Legitimate business expenses related to NIL can reduce taxable income. Common examples:

**Agent, manager, or marketplace fees.**

**Marketing and content costs** (ads, editing tools, web hosting).

**Equipment for content creation** used for NIL work.

**Travel** specifically for NIL appearances or shoots (not ordinary team travel).

**Professional services** (attorneys, accountants).

Athletic gear used only for football is usually a personal expense, not an NIL write-off. Keep categories clean.

## Quarterly Estimated Tax Payments

If you expect to owe $1,000 or more for the year, the IRS generally expects quarterly estimated payments (typical due dates: April 15, June 15, September 15, and January 15 of the following year).

A simple habit: set aside 25–30% of each NIL payment in a tax savings account.

## Filing Requirements

You may need to file even if income is modest — especially if self-employment net earnings exceed $400. Expect Schedule C (business income/expenses) and Schedule SE (self-employment tax) in many cases.

Companies that pay you $600 or more should issue a 1099. Report all income even if a form never arrives.

## Record-Keeping Best Practices

Track every payment (date, amount, payer, type), every NIL expense with receipts, contracts, 1099s, and mileage for NIL-only travel. A simple spreadsheet or bookkeeping app beats a scramble in March.

## When to Hire a Tax Professional

Get help if income climbs into the thousands, you have multi-state activity, you are forming an LLC, or the IRS contacts you. A CPA familiar with athlete or creator income is worth it.

## State Tax Considerations

State income tax may apply in your school state and sometimes in states where you earn appearance income. Athletes in no-income-tax states still owe federal tax.

## Conclusion

Report income, keep records, pay estimates when required, and get professional help as deals scale. Pair this with our [NIL deals guide](/guides/how-to-get-nil-deals-college) and [contract red flags](/guides/red-flags-nil-contracts).`,
  },
  {
    slug: "red-flags-nil-contracts",
    title: "Red Flags in NIL Contracts: A College Athlete Checklist",
    description:
      "Spot problematic clauses in NIL contracts before you sign — exclusivity, IP rights, payment terms, and compliance traps.",
    seoTitle: "Red Flags in NIL Contracts: College Athlete Checklist (2026) | Takkle",
    seoDescription:
      "Protect yourself from bad NIL deals. Learn the red flags in college athlete contracts, from exclusivity clauses to IP rights.",
    publishedDate: "2026-01-25",
    updatedDate: "2026-09-14",
    emailCTA: {
      headline: "Download the NIL Contract Review Checklist",
      description:
        "Get our free printable checklist to review any NIL contract before you sign.",
    },
    toc: [
      { id: "why-contracts-matter", title: "Why Contract Review Matters" },
      { id: "excessive-exclusivity", title: "Red Flag #1: Excessive Exclusivity" },
      { id: "ip-rights", title: "Red Flag #2: Broad IP Rights Transfers" },
      { id: "vague-deliverables", title: "Red Flag #3: Vague Deliverables" },
      { id: "no-termination", title: "Red Flag #4: No Termination Clause" },
      { id: "performance-bonuses", title: "Red Flag #5: Pay Tied to On-Field Results" },
      { id: "school-branding", title: "Red Flag #6: School Branding Requirements" },
      { id: "payment-terms", title: "Red Flag #7: Unreasonable Payment Terms" },
      { id: "morality-clauses", title: "Red Flag #8: One-Sided Morality Clauses" },
      { id: "compliance-silence", title: "Red Flag #9: No Compliance Language" },
      { id: "what-to-look-for", title: "What a Good NIL Contract Looks Like" },
      { id: "conclusion", title: "Conclusion" },
    ],
    content: `A brand or collective offered you an NIL deal. Before you sign, review the contract carefully. Clauses that look standard can limit future earnings, hand over your likeness forever, or create compliance risk.

This checklist covers the most common red flags for college athletes.

## Why Contract Review Matters

An NIL contract is legally binding. Brands draft for their protection — you need to advocate for yours. For larger deals, have an attorney review. Always clear deals with compliance when your school requires it.

## Red Flag #1: Excessive Exclusivity

**What it looks like:** Broad bans on any competing brand in an entire category for the term plus a long tail after termination.

**Why it's a problem:** You may block better deals in the same category for months or years.

**What to do:** Narrow exclusivity to named competitors, limit the post-term period, and price exclusivity into the fee.

## Red Flag #2: Broad IP Rights Transfers

**What it looks like:** Perpetual, irrevocable, worldwide rights to your name, image, voice, and bio for any use.

**Why it's a problem:** Your likeness can be reused long after the deal — or sold onward — with no extra pay.

**What to do:** Limit license scope, media, territory, and term. You license NIL; you should not give it away forever.

## Red Flag #3: Vague Deliverables

**What it looks like:** "Promote products as reasonably requested."

**Why it's a problem:** Unlimited asks for the same fee.

**What to do:** Specify post counts, formats, deadlines, and approval rights.

## Red Flag #4: No Termination Clause

**What it looks like:** No way for either party to exit early.

**Why it's a problem:** Injuries, transfers, or brand controversy leave you stuck.

**What to do:** Mutual termination with reasonable notice, plus cause provisions for material breach.

## Red Flag #5: Pay Tied to On-Field Results

**What it looks like:** Bonuses for touchdowns, wins, or statistical leaders.

**Why it's a problem:** Pay-for-play style structure can create compliance issues and blur NIL vs. athletic compensation.

**What to do:** Base pay on promotional deliverables, not game outcomes. Confirm with compliance.

## Red Flag #6: School Branding Requirements

**What it looks like:** Required use of jersey, logo, stadium, or school marks in content.

**Why it's a problem:** Institutional marks usually need separate rights. Unauthorized use can violate school policy.

**What to do:** Strip school-IP requirements unless your school has approved licensed use in writing.

## Red Flag #7: Unreasonable Payment Terms

**What it looks like:** 90–120 day payment windows or product-only compensation without clear value.

**Why it's a problem:** You deliver now and wait months — or get underpaid in merch.

**What to do:** Aim for 30 days or less; document cash vs. product value clearly.

## Red Flag #8: One-Sided Morality Clauses

**What it looks like:** Company may terminate for any conduct in its "sole discretion."

**Why it's a problem:** Easy pretext to cancel and withhold pay.

**What to do:** Make morality clauses mutual, specific, and notice-based when possible.

## Red Flag #9: No Compliance Language

**What it looks like:** Contract ignores school disclosure, NCAA/conference rules, or prohibited categories.

**Why it's a problem:** You can sign a deal that your compliance office later blocks.

**What to do:** Add language that the deal is contingent on school/conference compliance approval where required.

## What a Good NIL Contract Looks Like

Clear parties, specific deliverables, defined compensation and timing, limited image rights for the term, reasonable duration with renewal options, mutual termination, content approval, and compliance acknowledgment.

## Conclusion

Good contracts protect eligibility and future earning power. When dollars get meaningful, pay for a legal review. Then keep building with our [NIL deals guide](/guides/how-to-get-nil-deals-college) and [College Eligibility Calculator](/college).`,
  },
  {
    slug: "build-athlete-personal-brand",
    title: "How to Build Your College Athlete Personal Brand",
    description:
      "A practical guide for college athletes on building an authentic personal brand that attracts NIL opportunities and recruiter attention.",
    seoTitle: "Build Your College Athlete Personal Brand (2026 Guide) | Takkle",
    seoDescription:
      "Learn how to build a strong personal brand as a college athlete. Practical tips for social media, content, and attracting NIL deals.",
    publishedDate: "2026-02-01",
    updatedDate: "2026-09-14",
    emailCTA: {
      headline: "Download the Personal Brand Starter Plan",
      description:
        "Get a free one-page brand plan template for college athletes.",
    },
    toc: [
      { id: "why-personal-brand", title: "Why Personal Branding Matters" },
      { id: "define-your-brand", title: "Defining Your Brand Identity" },
      { id: "choose-platforms", title: "Choosing the Right Platforms" },
      { id: "content-strategy", title: "Creating a Content Strategy" },
      { id: "grow-audience", title: "Growing Your Audience" },
      { id: "engage-community", title: "Building a Community" },
      { id: "protect-your-brand", title: "Protecting Your Brand" },
      { id: "transfer-portal", title: "Brand Through the Portal" },
      { id: "conclusion", title: "Conclusion" },
    ],
    content: `In the NIL era, a college athlete's personal brand is the foundation for deals, fan connection, and life after eligibility. Building it while balancing class, practice, and travel is hard — but a simple system works.

## Why Personal Branding Matters

A strong brand attracts sponsors, helps collectives pitch you, and gives transfer/portal audiences a clear story. It also creates optionality when football ends — media, coaching, business, or creator work.

## Defining Your Brand Identity

Pick three traits you want people to associate with you (e.g., tough, thoughtful, community-first). Align photos, captions, and partnerships to those traits. Inconsistency confuses brands.

Define your audience: fans, local businesses, national category sponsors, or fellow athletes. Content should serve that audience.

## Choosing the Right Platforms

Most college athletes win with Instagram + TikTok done well. Add YouTube if you can sustain longer film. Keep handles consistent and bios clear: position, school, and how to contact for NIL.

## Creating a Content Strategy

Batch content around training, game weeks, academics, and community. Mix performance clips with personality. Schedule posts so you are not inventing captions at midnight after meetings.

## Growing Your Audience

Collaborate with teammates, use relevant hashtags sparingly, and cross-post highlights to your [Takkle profile](/onboarding). Quality engagement beats bought followers every time.

## Building a Community

Reply to fans. Spotlight local causes. Brands buy trust, not vanity metrics alone.

## Protecting Your Brand

Assume every post is permanent and searchable by compliance and sponsors. Avoid prohibited categories and anything that conflicts with team rules. Review deals before you post sponsored content.

## Brand Through the Portal

If you enter the portal, keep messaging professional: availability, film, and fit — not drama. Your brand follows you to the next school.

## Conclusion

Personal brand is a long investment across your eligibility window. Start simple, stay consistent, and pair it with clean [NIL deal habits](/guides/how-to-get-nil-deals-college) and an accurate [eligibility plan](/college).`,
  },
  {
    slug: "best-nutrition-supplements-college-athletes",
    title: "Best Nutrition and Supplements for College Athletes",
    description:
      "A practical guide to fueling college football athletes for peak performance — nutrition basics, supplements, hydration, and meal planning.",
    seoTitle: "Best Nutrition & Supplements for College Athletes (2026) | Takkle",
    seoDescription:
      "Science-backed nutrition guide for college athletes. Fueling, safe supplements, hydration, and meal planning for peak performance.",
    publishedDate: "2026-02-05",
    updatedDate: "2026-09-14",
    emailCTA: {
      headline: "Download the Weekly Meal Plan Template",
      description:
        "Get a free weekly meal plan template designed for college football athletes.",
    },
    toc: [
      { id: "nutrition-foundations", title: "Nutrition Foundations for Athletes" },
      { id: "macronutrients", title: "Understanding Macronutrients" },
      { id: "hydration", title: "Hydration Strategies" },
      { id: "pre-game-nutrition", title: "Pre-Game and Pre-Practice Nutrition" },
      { id: "post-workout", title: "Post-Workout Recovery Nutrition" },
      { id: "supplements", title: "Supplements: What Works and What Doesn't" },
      { id: "meal-planning", title: "Practical Meal Planning Tips" },
      { id: "common-mistakes", title: "Common Nutrition Mistakes" },
      { id: "conclusion", title: "Conclusion" },
    ],
    content: `Nutrition drives how you train, compete, recover, and stay available through a long college season. Between classes, travel, and meetings, food is easy to deprioritize — and that shows up on film.

This guide is a practical approach for college football athletes.

## Nutrition Foundations for Athletes

**Higher calorie needs.** Heavy training weeks may require well above typical student intake depending on body size and position demands.

**Consistency over perfection.** Regular meals beat chaotic under-eating followed by late-night binges.

**Work with campus resources.** Many programs have sports dietitians — use them, especially in camp and in-season.

## Understanding Macronutrients

**Carbohydrates** fuel high-intensity work and recovery between sessions.

**Protein** supports muscle repair; distribute it across meals rather than one giant shake.

**Fats** support hormones and overall energy — include quality sources daily.

## Hydration Strategies

Dehydration quietly kills practice quality. Weigh in/out around hard sessions when possible, replace fluids and electrolytes, and do not wait until you feel thirsty in heat.

## Pre-Game and Pre-Practice Nutrition

Eat familiar foods timed so you are fueled but not heavy. Carb-focused meals a few hours out, plus a light snack closer to kickoff or practice, work for many athletes. Avoid first-time experiments on game day.

## Post-Workout Recovery Nutrition

Get protein + carbs in after lifts and games. Chocolate milk, a balanced cafeteria plate, or a simple shake plus fruit all work if you actually consume them.

## Supplements: What Works and What Doesn't

Food first. Evidence-supported options for many athletes include creatine monohydrate, caffeine (timed and dosed carefully), vitamin D if deficient, and omega-3s — but only after checking with medical/performance staff.

Avoid gray-market fat burners and anything that risks a banned substance. Third-party tested products (NSF Certified for Sport or equivalent) reduce risk. When unsure, ask your athletic trainer or dietitian.

## Practical Meal Planning Tips

Use dining halls strategically: build plates around lean protein, carbs, and produce. Keep dorm-friendly backups (oats, Greek yogurt, fruit, tuna, rice cups). On road trips, pack snacks so you are not stuck with gas-station defaults only.

## Common Nutrition Mistakes

Skipping breakfast before morning lifts, under-drinking on travel days, relying on supplements instead of meals, and crash-cutting weight without staff guidance.

## Conclusion

Good nutrition is a competitive advantage you control daily. Pair it with recovery, sleep, and a clear eligibility plan via the [College Eligibility Calculator](/college). For NIL and brand resources, explore more [Player Guides](/guides).`,
  },
];

export function getGuideBySlug(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}

export function getAllGuideSlugs(): string[] {
  return guides.map((g) => g.slug);
}
