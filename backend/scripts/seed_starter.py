"""Starter flashcard decks for Memorize. Safe to run repeatedly: a deck whose
title already exists is left alone, so admin edits are never overwritten.

    python -m scripts.seed_starter

Card lines are "front | back | example" (example optional).
"""

import asyncio

from sqlalchemy import select

from core.config import get_settings
from db.session import build_engine
from models import Card, Deck, Exam, Subject

# (title, kind, exam code or None, subject slug or None, description, cards)
DECKS = [
    (
        "Essential Vocabulary I",
        "vocabulary",
        None,
        "english-verbal",
        "High-frequency words for synonyms, antonyms, analogies and sentence completion.",
        """
Abate | to become less strong or intense | The storm abated by the evening.
Aberration | a departure from what is normal or expected | One low score was an aberration in her record.
Acumen | the ability to judge situations well and quickly | His business acumen helped the shop grow.
Adamant | refusing to change one's mind | She was adamant that she would finish the race.
Alleviate | to make pain or a problem less severe | The medicine alleviated his headache.
Ambiguous | having more than one possible meaning | The instructions were ambiguous, so we asked again.
Ameliorate | to make something bad better | New wells ameliorated the water shortage.
Antithesis | the direct opposite | Laziness is the antithesis of success.
Apathy | lack of interest or concern | Voter apathy led to a low turnout.
Arduous | difficult and tiring | The climb to the summit was arduous.
Astute | clever at understanding people and situations | An astute student spots the trick in a question.
Benevolent | kind and generous | A benevolent donor paid for the new library.
Brevity | the use of few words | Brevity is valued in a good summary.
Candid | honest and direct | He gave a candid answer about his mistakes.
Capricious | changing mood or behaviour suddenly | The capricious weather spoiled the picnic.
Cogent | clear, logical and convincing | She made a cogent case for more libraries.
Complacent | too satisfied with oneself to keep trying | After one win, the team became complacent.
Conundrum | a confusing and difficult problem | Choosing a university was a real conundrum.
Copious | in large amounts | She took copious notes in class.
Credulous | too ready to believe things | Only a credulous reader would trust that rumour.
Deference | polite respect | Out of deference to his teacher, he stayed quiet.
Diligent | careful and hard-working | Diligent practice improves test scores.
Discern | to notice or understand something that is not obvious | It was hard to discern a pattern in the data.
Eloquent | fluent and persuasive in speaking or writing | Her eloquent speech moved the audience.
Ephemeral | lasting a very short time | Fame on social media is often ephemeral.
""",
    ),
    (
        "Essential Vocabulary II",
        "vocabulary",
        None,
        "english-verbal",
        "More high-frequency words, with an example sentence for each.",
        """
Erudite | having great knowledge gained from study | The erudite professor quoted three poets from memory.
Exacerbate | to make a problem worse | Shouting will only exacerbate the argument.
Frugal | careful with money; not wasteful | A frugal student saves part of every allowance.
Garrulous | talking too much, especially about unimportant things | The garrulous passenger talked for the whole trip.
Gregarious | fond of company; sociable | Gregarious people enjoy group projects.
Hackneyed | used so often that it is no longer interesting | Avoid hackneyed phrases in your essay.
Impetuous | acting quickly without thinking | His impetuous decision cost him the match.
Inevitable | certain to happen | Some change is inevitable.
Lucid | clearly expressed and easy to understand | The book gives a lucid account of the war.
Meticulous | showing great attention to detail | She is meticulous about checking her answers.
Mitigate | to make something less severe or harmful | Trees mitigate the effects of summer heat.
Novice | a beginner | As a novice, he started with the easy questions.
Obsolete | no longer used; out of date | Floppy disks are now obsolete.
Ostentatious | showing off wealth in order to impress | They held an ostentatious wedding.
Pragmatic | dealing with things in a practical way | A pragmatic plan focuses on what can actually be done.
Prudent | careful and sensible about the future | It is prudent to start preparing early.
Reticent | not revealing one's thoughts or feelings easily | He was reticent about his results.
Scrutinize | to examine something closely | Scrutinize every option before you answer.
Spurious | false, although it seems genuine | The claim was based on spurious data.
Tenacious | holding firmly; not giving up | A tenacious student keeps trying the hard questions.
Trivial | of little importance | Don't waste time on trivial details.
Ubiquitous | found everywhere | Mobile phones are ubiquitous today.
Vindicate | to show that someone was right | The results vindicated her method.
Volatile | likely to change suddenly | Fuel prices are volatile.
Zealous | full of energy and enthusiasm for a cause | The zealous volunteers worked all night.
""",
    ),
    (
        "Algebra & Arithmetic Formulas",
        "formula",
        None,
        "quantitative",
        "Identities, sequences, percentages and counting rules used in quantitative reasoning.",
        """
(a + b)² | a² + 2ab + b² | (x + 3)² = x² + 6x + 9
(a − b)² | a² − 2ab + b² | (x − 4)² = x² − 8x + 16
a² − b² | (a + b)(a − b) | 49 − 16 = (7 + 4)(7 − 4) = 33
(a + b)³ | a³ + 3a²b + 3ab² + b³
Quadratic formula (ax² + bx + c = 0) | x = (−b ± √(b² − 4ac)) / 2a | x² − 5x + 6 = 0 gives x = 2 or x = 3
Sum and product of roots of ax² + bx + c = 0 | sum = −b/a, product = c/a | x² − 5x + 6 = 0: sum 5, product 6
Arithmetic sequence: nth term | aₙ = a + (n − 1)d | 3, 7, 11, …: a₁₀ = 3 + 9 × 4 = 39
Arithmetic series: sum of n terms | Sₙ = n/2 × (2a + (n − 1)d) | 1 + 2 + … + 100 = 5050
Geometric sequence: nth term | aₙ = a × rⁿ⁻¹ | 2, 6, 18, …: a₅ = 2 × 3⁴ = 162
Percentage change | (new − old) ÷ old × 100 | 80 → 100 is a 25% increase
Simple interest | I = P × R × T ÷ 100 | Rs 1000 at 5% for 2 years: I = Rs 100
Compound amount | A = P(1 + r/100)ⁿ | Rs 1000 at 10% for 2 years: A = Rs 1210
Average | sum of the values ÷ number of values | The average of 4, 6 and 11 is 7
Distance, speed, time | distance = speed × time | 60 km/h for 2.5 hours = 150 km
Laws of exponents | aᵐ × aⁿ = aᵐ⁺ⁿ;  aᵐ ÷ aⁿ = aᵐ⁻ⁿ;  (aᵐ)ⁿ = aᵐⁿ;  a⁰ = 1
Logarithm rules | log(xy) = log x + log y;  log(x/y) = log x − log y;  log(xⁿ) = n log x
Permutations (order matters) | ⁿPᵣ = n! ÷ (n − r)! | ⁵P₂ = 20
Combinations (order does not matter) | ⁿCᵣ = n! ÷ (r!(n − r)!) | ⁵C₂ = 10
Probability | favourable outcomes ÷ total outcomes | One die: P(even) = 3/6 = 1/2
""",
    ),
    (
        "Geometry & Mensuration",
        "formula",
        None,
        "quantitative",
        "Areas, volumes, angles and coordinate geometry.",
        """
Area of a triangle | ½ × base × height | base 10, height 6: area 30
Pythagoras' theorem | a² + b² = c² (c is the hypotenuse) | Sides 3 and 4 give a hypotenuse of 5
Area of a circle | πr² | r = 7: area ≈ 154
Circumference of a circle | 2πr | r = 7: circumference ≈ 44
Area of a trapezium | ½(a + b) × h (a and b are the parallel sides)
Volume of a cylinder | πr²h
Volume of a cone | ⅓πr²h
Volume of a sphere | ⁴⁄₃πr³
Surface area of a sphere | 4πr²
Sum of interior angles of a polygon | (n − 2) × 180° | Hexagon (n = 6): 720°
Distance between two points | √((x₂ − x₁)² + (y₂ − y₁)²) | (0, 0) to (3, 4): 5
Slope of a line | m = (y₂ − y₁) ÷ (x₂ − x₁)
Midpoint of a line segment | ((x₁ + x₂)/2, (y₁ + y₂)/2)
""",
    ),
    (
        "Physics Formulas",
        "formula",
        None,
        "physics",
        "Mechanics, energy, electricity and waves.",
        """
Equations of motion | v = u + at;  s = ut + ½at²;  v² = u² + 2as
Newton's second law | F = ma | 2 kg accelerating at 3 m/s² needs 6 N
Weight | W = mg (g ≈ 9.8 m/s²)
Momentum | p = mv
Work done | W = Fd cos θ (unit: joule)
Kinetic energy | KE = ½mv²
Gravitational potential energy | PE = mgh
Power | P = W ÷ t (unit: watt)
Ohm's law | V = IR
Electrical power | P = VI = I²R = V²/R
Resistors in series and parallel | Series: R = R₁ + R₂;  parallel: 1/R = 1/R₁ + 1/R₂
Wave speed | v = fλ
Density | ρ = m ÷ V
Pressure | P = F ÷ A (unit: pascal)
Coulomb's law | F = kq₁q₂ ÷ r²
Speed of light in a vacuum | c ≈ 3 × 10⁸ m/s
""",
    ),
    (
        "Chemistry Essentials",
        "formula",
        None,
        "chemistry",
        "Moles, gas laws, pH and atomic structure.",
        """
Avogadro's number | 6.022 × 10²³ particles in one mole
Number of moles | n = mass ÷ molar mass | 36 g of water (18 g/mol) = 2 mol
Ideal gas equation | PV = nRT (R = 8.314 J mol⁻¹ K⁻¹)
Boyle's law | P₁V₁ = P₂V₂ (at constant temperature)
Charles's law | V₁/T₁ = V₂/T₂ (at constant pressure, T in kelvin)
pH | pH = −log[H⁺]: 7 is neutral, below 7 is acidic, above 7 is basic
Molarity | moles of solute ÷ litres of solution
Molar volume of a gas at STP | 22.4 dm³ (litres) per mole
Atomic number | the number of protons in the nucleus
Mass number | protons + neutrons
Isotopes | atoms of the same element with different numbers of neutrons | Carbon-12 and carbon-14
Oxidation and reduction | Oxidation is loss of electrons; reduction is gain of electrons (OIL RIG)
""",
    ),
    (
        "Analytical Reasoning Rules",
        "fact",
        None,
        "analytical",
        "Logic rules and solving tips for analytical reasoning questions.",
        """
"All A are B" and "All B are C" | Therefore all A are C
"Some A are B" | At least one A is a B. It does not tell you that some A are not B.
Contrapositive of "If P then Q" | "If not Q, then not P". It is always true when the statement is true.
Converse of "If P then Q" | "If Q, then P". It is not necessarily true.
Number series: first step | Look at the differences between terms, then at the ratios
Seating arrangements | Draw the seats first, then place the most certain clue
Blood relations | Draw a family tree: one row per generation, a line for each marriage
Direction sense | Facing north, a right turn faces east and a left turn faces west
"Either A or B" in a rule | At least one of A and B. Check whether the rule also allows both.
""",
    ),
    (
        "Computer Science Basics",
        "fact",
        None,
        "computer-science",
        "Core terms for the USAT computer science section.",
        """
Bit and byte | 1 byte = 8 bits
1 kilobyte (binary) | 1024 bytes
Binary 1011 in decimal | 11 (8 + 0 + 2 + 1)
CPU | Central Processing Unit: carries out the instructions of a program
RAM vs ROM | RAM is temporary and is lost when power is off; ROM keeps its data permanently
Compiler vs interpreter | A compiler translates the whole program first; an interpreter runs it line by line
Operating system | Software that manages the hardware and runs programs | Windows, Linux, Android
IP address | A number that identifies a device on a network
HTTP | The protocol used to transfer web pages
Algorithm | A step-by-step set of instructions that solves a problem
Binary search | Finds an item in a sorted list in O(log n) steps
Logic gates | AND outputs 1 only if both inputs are 1; OR outputs 1 if any input is 1; NOT reverses its input
""",
    ),
]


def _cards(raw: str) -> list[dict]:
    out = []
    for line in raw.strip().splitlines():
        parts = [p.strip() for p in line.split("|")]
        out.append({"front": parts[0], "back": parts[1], "example": parts[2] if len(parts) > 2 else None})
    return out


async def main() -> None:
    s = get_settings()
    engine = build_engine(s.database_url_migrations or s.database_url, pool_size=0)
    added = 0
    async with engine.begin() as conn:
        exams = dict((await conn.execute(select(Exam.code, Exam.id))).all())
        subjects = dict((await conn.execute(select(Subject.slug, Subject.id))).all())
        existing = set((await conn.execute(select(Deck.title))).scalars())
        for order, (title, kind, exam, slug, desc, raw) in enumerate(DECKS, start=1):
            if title in existing:
                continue
            deck_id = (
                await conn.execute(
                    Deck.__table__.insert()
                    .values(
                        title=title,
                        kind=kind,
                        exam_id=exams.get(exam) if exam else None,
                        subject_id=subjects.get(slug) if slug else None,
                        description=desc,
                        status="published",
                        sort_order=order,
                    )
                    .returning(Deck.__table__.c.id)
                )
            ).scalar_one()
            await conn.execute(
                Card.__table__.insert(),
                [{"deck_id": deck_id, "sort_order": i, **c} for i, c in enumerate(_cards(raw), start=1)],
            )
            added += 1
    await engine.dispose()
    print(f"Starter decks added: {added} (skipped {len(DECKS) - added} that already exist).")


if __name__ == "__main__":
    asyncio.run(main())
