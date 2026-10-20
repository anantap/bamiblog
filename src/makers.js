// The companies behind noodle brands, for the "who makes what" sociogram on /bamiversary/. Add a brand here
// when a new one shows up; brands that aren't listed are drawn on their own.
export const MAKERS = {
  Indofood: ["Indomie", "Sarimi", "Supermi", "Pop Mie"],
  "Wings Food": ["Mie Sedaap"],
  "Nissin Foods": ["Nissin", "Cup Noodles", "Demae Ramen", "Myojo"],
  "Monde Nissin": ["Lucky Me!"],
  "Samyang Foods": ["Samyang", "Buldak"],
  Nongshim: ["Nongshim", "Shin Ramyun"],
  Ottogi: ["Ottogi", "Jin Ramen"],
  "Thai President Foods": ["Mama"],
  "Toyo Suisan": ["Maruchan"],
  "Sanyo Foods": ["Sapporo Ichiban"],
  Acecook: ["Acecook", "Hao Hao"],
  "Tat Hui Foods": ["Koka"],
  Nestlé: ["Maggi"],
  Tingyi: ["Master Kong"],
};

const key = (name) => (name ?? "").trim().replace(/\s+/g, " ").toLowerCase();

// Who makes the brands eaten: companies with at least one of their brands eaten, each with all their brands
// (eaten or not yet) and `eaten` when its own name was, and the eaten brands with no company listed.
export function makers(eatenBrands) {
  const eaten = new Map(eatenBrands.map((b) => [key(b), b]));
  const known = new Set();
  const companies = [];
  for (const [company, brands] of Object.entries(MAKERS)) {
    brands.forEach((b) => known.add(key(b)));
    if (!brands.some((b) => eaten.has(key(b)))) continue;
    companies.push({ company, brands: brands.map((b) => ({ brand: eaten.get(key(b)) ?? b, eaten: eaten.has(key(b)) })) });
  }
  // A company sharing its name with a brand (Nongshim) is that brand too, rather than pointing at itself.
  for (const c of companies) {
    c.eaten = c.brands.some((b) => key(b.brand) === key(c.company) && b.eaten);
    c.brands = c.brands.filter((b) => key(b.brand) !== key(c.company));
  }
  return { companies, loners: [...eaten].filter(([k]) => !known.has(k)).map(([, b]) => b) };
}
