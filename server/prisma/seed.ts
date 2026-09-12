/**
 * Seeds a demo-ready store: taxonomy, ~50 products, staff and client accounts,
 * reviews and a spread of orders across every status.
 *
 * Run with: npm run db:seed  (or npm run db:reset to rebuild from scratch)
 */
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { SHOP_DOMAIN, SHOP_NAME } from '../src/lib/constants';
import { derivedProductFields } from '../src/lib/product-fields';
import { slugify } from '../src/lib/slug';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const prisma = new PrismaClient();

/** The shop's own line. Product names use the short form to stay readable. */
const HOUSE_BRAND = SHOP_NAME;
const HOUSE_SHORT = SHOP_NAME.split(' ')[0];

/* --------------------------------- content -------------------------------- */

const CATEGORIES: {
  name: string;
  slug: string;
  icon: string;
  children?: { name: string; slug: string }[];
}[] = [
  {
    name: 'Протеїн',
    slug: 'protein',
    icon: '🥤',
    children: [
      { name: 'Сироватковий', slug: 'whey-protein' },
      { name: 'Ізолят', slug: 'isolate-protein' },
      { name: 'Казеїн', slug: 'casein-protein' },
      { name: 'Рослинний', slug: 'plant-protein' },
    ],
  },
  { name: 'Креатин', slug: 'creatine', icon: '💪' },
  { name: 'Гейнери', slug: 'gainers', icon: '🍚' },
  {
    name: 'Амінокислоти',
    slug: 'amino-acids',
    icon: '🧬',
    children: [
      { name: 'BCAA', slug: 'bcaa' },
      { name: 'EAA', slug: 'eaa' },
      { name: 'Глютамін', slug: 'glutamine' },
    ],
  },
  { name: 'Передтренувальні комплекси', slug: 'pre-workout', icon: '⚡' },
  { name: 'Вітаміни', slug: 'vitamins', icon: '💊' },
  { name: 'Омега-3', slug: 'omega-3', icon: '🐟' },
  { name: 'Жироспалювачі', slug: 'fat-burners', icon: '🔥' },
  { name: 'Батончики', slug: 'bars', icon: '🥜' },
  { name: 'Ізотоніки', slug: 'isotonics', icon: '💧' },
  { name: 'Енергетики', slug: 'energy', icon: '🔋' },
  { name: 'Спортивні аксесуари', slug: 'accessories', icon: '🎽' },
  { name: 'Шейкери', slug: 'shakers', icon: '🧴' },
  { name: 'Одяг', slug: 'apparel', icon: '👕' },
];

const BRANDS: { name: string; country: string }[] = [
  { name: HOUSE_BRAND, country: 'Україна' },
  { name: 'Optimum Nutrition', country: 'США' },
  { name: 'BioTech USA', country: 'Угорщина' },
  { name: 'Scitec Nutrition', country: 'Угорщина' },
  { name: 'MyProtein', country: 'Велика Британія' },
  { name: 'Dymatize', country: 'США' },
  { name: 'Universal Nutrition', country: 'США' },
  { name: 'Olimp Sport Nutrition', country: 'Польща' },
  { name: 'Weider', country: 'Німеччина' },
  { name: 'Rule One Proteins', country: 'США' },
  { name: 'NOW Foods', country: 'США' },
  { name: 'Trec Nutrition', country: 'Польща' },
];

type SeedProduct = {
  name: string;
  brand: string;
  category: string;
  price: number;
  oldPrice?: number;
  stock: number;
  weight?: string;
  weights?: string[];
  flavor?: string;
  flavors?: string[];
  form: string;
  goals: string[];
  description: string;
  specs?: [string, string][];
  isNew?: boolean;
  isBestseller?: boolean;
  isFeatured?: boolean;
  soldCount?: number;
};

const FLAVOURS = {
  classic: ['Шоколад', 'Ваніль', 'Банан', 'Солона карамель', 'Печиво-крем'],
  fruit: ['Кавун', 'Лісові ягоди', 'Манго', 'Цитрус', 'Вишня'],
  neutral: ['Без смаку'],
};

const PRODUCTS: SeedProduct[] = [
  /* ---------------------------------- протеїн --------------------------------- */
  {
    name: 'Gold Standard 100% Whey',
    brand: 'Optimum Nutrition',
    category: 'whey-protein',
    price: 2190,
    oldPrice: 2590,
    stock: 34,
    weight: '2270 г',
    weights: ['908 г', '2270 г', '4540 г'],
    flavors: FLAVOURS.classic,
    form: 'Порошок',
    goals: ['mass', 'recovery'],
    description:
      'Еталонний сироватковий протеїн, який тримає планку якості вже два десятиліття. 24 г білка на порцію, повний профіль BCAA і майже повна відсутність осаду навіть у шейкері з холодною водою.',
    specs: [
      ['Білок на порцію', '24 г'],
      ['BCAA', '5,5 г'],
      ['Порцій в упаковці', '74'],
      ['Вуглеводи', '3 г'],
    ],
    isBestseller: true,
    isFeatured: true,
    soldCount: 412,
  },
  {
    name: 'ISO Whey Zero Isolate',
    brand: 'BioTech USA',
    category: 'isolate-protein',
    price: 2450,
    stock: 21,
    weight: '2270 г',
    weights: ['908 г', '2270 г'],
    flavors: ['Шоколад', 'Ваніль', 'Солона карамель', 'Тірамісу'],
    form: 'Порошок',
    goals: ['cutting', 'recovery'],
    description:
      'Ізолят без лактози і майже без вуглеводів — для періоду сушки, коли кожен грам має значення. 25 г білка при 1 г жиру на порцію.',
    specs: [
      ['Білок на порцію', '25 г'],
      ['Лактоза', '0 г'],
      ['Жири', '1 г'],
    ],
    isBestseller: true,
    soldCount: 288,
  },
  {
    name: '100% Whey Protein Professional',
    brand: 'Scitec Nutrition',
    category: 'whey-protein',
    price: 1890,
    oldPrice: 2290,
    stock: 48,
    weight: '2350 г',
    weights: ['920 г', '2350 г', '5000 г'],
    flavors: FLAVOURS.classic,
    form: 'Порошок',
    goals: ['mass', 'recovery'],
    description:
      'Робочий щоденний протеїн із додатковим комплексом амінокислот і травних ферментів. Добре розчиняється і не дає важкості в шлунку.',
    specs: [
      ['Білок на порцію', '22 г'],
      ['Ферменти', 'Папаїн, бромелаїн'],
      ['Порцій', '78'],
    ],
    isBestseller: true,
    soldCount: 355,
  },
  {
    name: 'Impact Whey Protein',
    brand: 'MyProtein',
    category: 'whey-protein',
    price: 1490,
    stock: 62,
    weight: '1000 г',
    weights: ['1000 г', '2500 г'],
    flavors: ['Шоколад', 'Ваніль', 'Банан', 'Полуниця', 'Без смаку'],
    form: 'Порошок',
    goals: ['mass', 'recovery'],
    description:
      'Найраціональніший спосіб закрити норму білка. Без надмірностей у складі й без надмірностей у ціні.',
    specs: [
      ['Білок на порцію', '21 г'],
      ['Ціна за 100 г білка', 'від 71 ₴'],
    ],
    soldCount: 501,
    isBestseller: true,
  },
  {
    name: 'ISO 100 Hydrolyzed',
    brand: 'Dymatize',
    category: 'isolate-protein',
    price: 3290,
    oldPrice: 3890,
    stock: 12,
    weight: '2270 г',
    weights: ['932 г', '2270 г'],
    flavors: ['Печиво-крем', 'Шоколад', 'Ваніль', 'Фундук'],
    form: 'Порошок',
    goals: ['cutting', 'recovery'],
    description:
      'Гідролізований ізолят — найшвидше засвоєння з усіх форм сироватки. Ідеальний варіант відразу після важкого тренування.',
    specs: [
      ['Білок на порцію', '25 г'],
      ['Цукор', '0 г'],
      ['Гідролізат', 'Так'],
    ],
    isFeatured: true,
    soldCount: 164,
  },
  {
    name: 'Micellar Casein Night',
    brand: HOUSE_BRAND,
    category: 'casein-protein',
    price: 1690,
    stock: 27,
    weight: '1800 г',
    weights: ['900 г', '1800 г'],
    flavors: ['Шоколад', 'Ваніль', 'Печиво-крем'],
    form: 'Порошок',
    goals: ['recovery', 'cutting'],
    description:
      'Повільний білок на ніч: живить м’язи 6–7 годин і добре тримає відчуття насичення під час дефіциту калорій.',
    specs: [
      ['Білок на порцію', '24 г'],
      ['Час засвоєння', '6–7 год'],
    ],
    isNew: true,
    soldCount: 73,
  },
  {
    name: 'Vegan Protein Blend',
    brand: HOUSE_BRAND,
    category: 'plant-protein',
    price: 1390,
    stock: 31,
    weight: '900 г',
    weights: ['900 г'],
    flavors: ['Шоколад', 'Ваніль', 'Без смаку'],
    form: 'Порошок',
    goals: ['recovery', 'health'],
    description:
      'Горох, рис і гарбузове насіння у співвідношенні, що дає повний амінокислотний профіль. Без сої, без лактози, без глютену.',
    specs: [
      ['Білок на порцію', '22 г'],
      ['Джерела', 'Горох, рис, гарбуз'],
    ],
    isNew: true,
    soldCount: 58,
  },
  {
    name: 'R1 Protein Whey Blend',
    brand: 'Rule One Proteins',
    category: 'protein',
    price: 2090,
    stock: 18,
    weight: '2270 г',
    weights: ['1000 г', '2270 г'],
    flavors: FLAVOURS.classic,
    form: 'Порошок',
    goals: ['mass'],
    description:
      'Суміш ізоляту та концентрату з високою часткою білка на грам продукту. Мінімум наповнювачів у складі.',
    soldCount: 121,
  },

  /* ---------------------------------- креатин --------------------------------- */
  {
    name: 'Creatine Monohydrate Micronized',
    brand: 'Optimum Nutrition',
    category: 'creatine',
    price: 890,
    oldPrice: 1090,
    stock: 74,
    weight: '600 г',
    weights: ['300 г', '600 г', '1200 г'],
    flavors: FLAVOURS.neutral,
    form: 'Порошок',
    goals: ['strength', 'mass'],
    description:
      'Найдослідженіша добавка в спорті. 5 г мікронізованого моногідрату на порцію — плюс до силових показників уже за два тижні.',
    specs: [
      ['Креатин на порцію', '5 г'],
      ['Форма', 'Мікронізований моногідрат'],
      ['Порцій', '120'],
    ],
    isBestseller: true,
    isFeatured: true,
    soldCount: 623,
  },
  {
    name: 'Creatine 300 g',
    brand: HOUSE_BRAND,
    category: 'creatine',
    price: 549,
    stock: 96,
    weight: '300 г',
    weights: ['300 г'],
    flavors: FLAVOURS.neutral,
    form: 'Порошок',
    goals: ['strength'],
    description:
      'Чистий креатин моногідрат Creapure® без добавок. Базова банка, якої вистачає на два місяці щоденного приймання.',
    specs: [
      ['Сировина', 'Creapure®'],
      ['Порцій', '60'],
    ],
    isBestseller: true,
    soldCount: 389,
  },
  {
    name: 'Creatine Capsules 1250',
    brand: 'Olimp Sport Nutrition',
    category: 'creatine',
    price: 690,
    stock: 45,
    weight: '120 капсул',
    weights: ['120 капсул', '300 капсул'],
    form: 'Капсули',
    goals: ['strength', 'mass'],
    description:
      'Той самий моногідрат, тільки без шейкера й без мірної ложки. Зручно, коли тренування не вдома.',
    specs: [
      ['Капсул в упаковці', '120'],
      ['Креатину на капсулу', '1250 мг'],
    ],
    soldCount: 142,
  },
  {
    name: 'Creatine HCL Pro',
    brand: 'Trec Nutrition',
    category: 'creatine',
    price: 790,
    stock: 23,
    weight: '180 капсул',
    flavors: FLAVOURS.neutral,
    form: 'Капсули',
    goals: ['strength'],
    description:
      'Гідрохлоридна форма для тих, у кого моногідрат викликає затримку води. Менша порція, та сама ефективність.',
    isNew: true,
    soldCount: 61,
  },

  /* ---------------------------------- гейнери --------------------------------- */
  {
    name: 'Serious Mass Gainer',
    brand: 'Optimum Nutrition',
    category: 'gainers',
    price: 2790,
    oldPrice: 3190,
    stock: 16,
    weight: '5450 г',
    weights: ['2720 г', '5450 г'],
    flavors: ['Шоколад', 'Ваніль', 'Банан'],
    form: 'Порошок',
    goals: ['mass'],
    description:
      'Для тих, кому важко набрати вагу: 1250 ккал і 50 г білка на порцію разом із вітамінно-мінеральним комплексом.',
    specs: [
      ['Калорійність порції', '1250 ккал'],
      ['Білок', '50 г'],
      ['Вуглеводи', '252 г'],
    ],
    isBestseller: true,
    soldCount: 198,
  },
  {
    name: 'Mass Builder Complex',
    brand: HOUSE_BRAND,
    category: 'gainers',
    price: 1590,
    stock: 29,
    weight: '3000 г',
    weights: ['1500 г', '3000 г'],
    flavors: ['Шоколад', 'Печиво-крем', 'Ваніль'],
    form: 'Порошок',
    goals: ['mass'],
    description:
      'Збалансований гейнер із помірною кількістю цукру — набір ваги без зайвого жиру й важкості після порції.',
    soldCount: 87,
  },
  {
    name: 'Mutant Mass Extreme',
    brand: 'Universal Nutrition',
    category: 'gainers',
    price: 2390,
    stock: 11,
    weight: '4500 г',
    flavors: ['Шоколад', 'Ваніль'],
    form: 'Порошок',
    goals: ['mass', 'strength'],
    description: 'Висококалорійна формула з креатином і глютаміном у складі для періоду масонабору.',
    soldCount: 64,
  },

  /* -------------------------------- амінокислоти ------------------------------ */
  {
    name: 'BCAA 6400 Tablets',
    brand: 'Scitec Nutrition',
    category: 'bcaa',
    price: 890,
    stock: 52,
    weight: '375 таблеток',
    form: 'Таблетки',
    goals: ['recovery', 'cutting'],
    description:
      'Класичні BCAA 2:1:1 у таблетках. Приймати до і після тренування, щоб зменшити катаболізм у дефіциті калорій.',
    specs: [
      ['Співвідношення', '2:1:1'],
      ['Таблеток', '375'],
    ],
    soldCount: 174,
  },
  {
    name: 'BCAA Instant Powder',
    brand: HOUSE_BRAND,
    category: 'bcaa',
    price: 749,
    oldPrice: 949,
    stock: 41,
    weight: '400 г',
    weights: ['200 г', '400 г'],
    flavors: FLAVOURS.fruit,
    form: 'Порошок',
    goals: ['recovery'],
    description:
      'Розчинні BCAA з приємним фруктовим смаком — робоча заміна солодким напоям під час тренування.',
    isBestseller: true,
    soldCount: 233,
  },
  {
    name: 'EAA Complete Matrix',
    brand: 'BioTech USA',
    category: 'eaa',
    price: 1190,
    stock: 26,
    weight: '390 г',
    flavors: ['Кавун', 'Манго', 'Лісові ягоди'],
    form: 'Порошок',
    goals: ['recovery', 'mass'],
    description:
      'Усі дев’ять незамінних амінокислот, а не лише три. Більш повний інструмент для відновлення, ніж звичні BCAA.',
    isNew: true,
    soldCount: 79,
  },
  {
    name: 'L-Glutamine Pure',
    brand: 'NOW Foods',
    category: 'glutamine',
    price: 690,
    stock: 38,
    weight: '500 г',
    flavors: FLAVOURS.neutral,
    form: 'Порошок',
    goals: ['recovery', 'health'],
    description:
      'Глютамін для відновлення й підтримки імунітету в періоди високих тренувальних обсягів.',
    soldCount: 96,
  },
  {
    name: 'L-Carnitine 3000 Shots',
    brand: 'Olimp Sport Nutrition',
    category: 'amino-acids',
    price: 990,
    stock: 34,
    weight: '20 x 25 мл',
    flavors: ['Цитрус', 'Вишня'],
    form: 'Рідина',
    goals: ['cutting', 'energy'],
    description: 'Рідкий L-карнітин у порційних ампулах. Зручно брати з собою на кардіо.',
    soldCount: 118,
  },

  /* ----------------------------- передтренувальні ---------------------------- */
  {
    name: 'Pre-Workout Ignite',
    brand: HOUSE_BRAND,
    category: 'pre-workout',
    price: 1090,
    oldPrice: 1390,
    stock: 44,
    weight: '360 г',
    weights: ['180 г', '360 г'],
    flavors: FLAVOURS.fruit,
    form: 'Порошок',
    goals: ['energy', 'strength'],
    description:
      'Кофеїн, бета-аланін, цитрулін і тирозин у робочих дозуваннях. Дає фокус і пампінг без різкого падіння енергії після.',
    specs: [
      ['Кофеїн', '250 мг'],
      ['Бета-аланін', '3,2 г'],
      ['Цитрулін малат', '6 г'],
    ],
    isBestseller: true,
    isFeatured: true,
    soldCount: 341,
  },
  {
    name: 'Gold Pre-Workout',
    brand: 'Optimum Nutrition',
    category: 'pre-workout',
    price: 1290,
    stock: 25,
    weight: '330 г',
    flavors: ['Кавун', 'Зелене яблуко', 'Цитрус'],
    form: 'Порошок',
    goals: ['energy'],
    description:
      'Помірний склад для тих, кому не потрібен ударний передтрен: 175 мг кофеїну і креатин у складі.',
    soldCount: 152,
  },
  {
    name: 'Nitro Pump Extreme',
    brand: 'Trec Nutrition',
    category: 'pre-workout',
    price: 1190,
    stock: 19,
    weight: '400 г',
    flavors: ['Лісові ягоди', 'Кавун'],
    form: 'Порошок',
    goals: ['energy', 'strength'],
    description:
      'Акцент на пампінг: висока доза цитруліну та аргініну, помірний кофеїн. Підходить для вечірніх тренувань.',
    isNew: true,
    soldCount: 67,
  },

  /* ----------------------------------- вітаміни ------------------------------- */
  {
    name: 'Opti-Men Multivitamin',
    brand: 'Optimum Nutrition',
    category: 'vitamins',
    price: 990,
    oldPrice: 1190,
    stock: 57,
    weight: '180 таблеток',
    form: 'Таблетки',
    goals: ['health'],
    description:
      'Мультивітамінний комплекс, розрахований на чоловіків із регулярними тренуваннями. 75 активних компонентів.',
    specs: [
      ['Таблеток', '180'],
      ['Порцій', '60'],
    ],
    isBestseller: true,
    soldCount: 267,
  },
  {
    name: 'Opti-Women Multivitamin',
    brand: 'Optimum Nutrition',
    category: 'vitamins',
    price: 940,
    stock: 43,
    weight: '120 капсул',
    form: 'Капсули',
    goals: ['health'],
    description: 'Жіночий мультивітамін із залізом, фолатом і комплексом трав.',
    soldCount: 189,
  },
  {
    name: 'Vitamin D3 2000 IU',
    brand: 'NOW Foods',
    category: 'vitamins',
    price: 390,
    stock: 88,
    weight: '120 капсул',
    form: 'Капсули',
    goals: ['health'],
    description: 'Базовий вітамін D3 — те, чого бракує більшості в українську зиму.',
    soldCount: 312,
    isBestseller: true,
  },
  {
    name: 'ZMA Recovery Complex',
    brand: 'Scitec Nutrition',
    category: 'vitamins',
    price: 590,
    stock: 36,
    weight: '60 капсул',
    form: 'Капсули',
    goals: ['recovery', 'health'],
    description: 'Цинк, магній і B6 перед сном — для якості сну й гормонального фону.',
    soldCount: 104,
  },
  {
    name: 'Magnesium B6 Forte',
    brand: HOUSE_BRAND,
    category: 'vitamins',
    price: 349,
    stock: 71,
    weight: '90 таблеток',
    form: 'Таблетки',
    goals: ['recovery', 'health'],
    description: 'Магній цитрат у дозуванні, яке справді закриває дефіцит. Проти судом і втоми.',
    isNew: true,
    soldCount: 143,
  },

  /* ----------------------------------- омега-3 -------------------------------- */
  {
    name: 'Omega-3 Fish Oil 1000',
    brand: 'NOW Foods',
    category: 'omega-3',
    price: 590,
    oldPrice: 690,
    stock: 64,
    weight: '200 капсул',
    form: 'Капсули',
    goals: ['health', 'recovery'],
    description:
      'Очищена риб’ячий олія з молекулярною дистиляцією. 180 мг EPA і 120 мг DHA на капсулу.',
    specs: [
      ['EPA', '180 мг'],
      ['DHA', '120 мг'],
    ],
    isBestseller: true,
    soldCount: 276,
  },
  {
    name: 'Omega 3 Ultra Gold',
    brand: 'Olimp Sport Nutrition',
    category: 'omega-3',
    price: 690,
    stock: 39,
    weight: '120 капсул',
    form: 'Капсули',
    goals: ['health'],
    description: 'Підвищена концентрація EPA/DHA — менше капсул на ту саму добову норму.',
    soldCount: 91,
  },

  /* -------------------------------- жироспалювачі ----------------------------- */
  {
    name: 'Thermo Cut Burner',
    brand: HOUSE_BRAND,
    category: 'fat-burners',
    price: 890,
    oldPrice: 1190,
    stock: 33,
    weight: '90 капсул',
    form: 'Капсули',
    goals: ['cutting', 'energy'],
    description:
      'Термогенік на основі зеленого чаю, кофеїну та L-карнітину. Працює як інструмент у дефіциті калорій, а не замість нього.',
    specs: [
      ['Капсул', '90'],
      ['Кофеїн на порцію', '200 мг'],
    ],
    isBestseller: true,
    soldCount: 214,
  },
  {
    name: 'Lipo-6 Black Ultra',
    brand: 'BioTech USA',
    category: 'fat-burners',
    price: 1090,
    stock: 17,
    weight: '60 капсул',
    form: 'Капсули',
    goals: ['cutting'],
    description: 'Сильний термогенік для досвідчених користувачів. Не приймати після 16:00.',
    soldCount: 128,
  },
  {
    name: 'CLA 1000 Softgels',
    brand: 'MyProtein',
    category: 'fat-burners',
    price: 549,
    stock: 47,
    weight: '90 капсул',
    form: 'Капсули',
    goals: ['cutting', 'health'],
    description: 'Кон’югована лінолева кислота без стимуляторів — спокійний варіант для сушки.',
    soldCount: 72,
  },

  /* ---------------------------------- батончики ------------------------------- */
  {
    name: 'Protein Bar 30% (уп. 20 шт)',
    brand: HOUSE_BRAND,
    category: 'bars',
    price: 990,
    oldPrice: 1290,
    stock: 58,
    weight: '20 x 60 г',
    weights: ['1 шт', '20 x 60 г'],
    flavors: ['Солона карамель', 'Шоколад-кокос', 'Фундук', 'Печиво-крем'],
    form: 'Батончик',
    goals: ['cutting', 'recovery'],
    description:
      '18 г білка і менше 2 г цукру на батончик. Нормальна текстура — не крейда, як у більшості дешевих аналогів.',
    specs: [
      ['Білок', '18 г'],
      ['Цукор', '1,8 г'],
    ],
    isBestseller: true,
    soldCount: 398,
  },
  {
    name: 'Zero Bar Protein',
    brand: 'BioTech USA',
    category: 'bars',
    price: 79,
    stock: 240,
    weight: '50 г',
    flavors: ['Шоколад-марципан', 'Печиво-крем', 'Банан'],
    form: 'Батончик',
    goals: ['cutting'],
    description: 'Батончик без додавання цукру — на випадок, коли до нормальної їжі ще далеко.',
    soldCount: 611,
  },
  {
    name: 'Oat & Whey Energy Bar',
    brand: 'Weider',
    category: 'bars',
    price: 89,
    stock: 156,
    weight: '65 г',
    flavors: ['Ягоди', 'Шоколад'],
    form: 'Батончик',
    goals: ['energy', 'mass'],
    description: 'Овес плюс сироватковий білок: перекус перед тренуванням, а не замість вечері.',
    isNew: true,
    soldCount: 187,
  },

  /* ---------------------------- ізотоніки / енергетики ------------------------ */
  {
    name: 'Isotonic Hydration Drink',
    brand: HOUSE_BRAND,
    category: 'isotonics',
    price: 449,
    stock: 66,
    weight: '1000 г',
    flavors: ['Цитрус', 'Кавун', 'Лісові ягоди'],
    form: 'Порошок',
    goals: ['energy', 'recovery'],
    description:
      'Електроліти й швидкі вуглеводи для тренувань довше години. Не надто солодкий, добре п’ється на бігу.',
    specs: [
      ['Натрій на порцію', '400 мг'],
      ['Порцій', '40'],
    ],
    isNew: true,
    soldCount: 132,
  },
  {
    name: 'Carbo Energy Powder',
    brand: 'Scitec Nutrition',
    category: 'isotonics',
    price: 690,
    stock: 28,
    weight: '1000 г',
    flavors: ['Цитрус', 'Без смаку'],
    form: 'Порошок',
    goals: ['energy', 'mass'],
    description: 'Комплекс вуглеводів для тривалих навантажень та відновлення глікогену після.',
    soldCount: 58,
  },
  {
    name: 'Energy Gel Boost (уп. 12 шт)',
    brand: 'Trec Nutrition',
    category: 'energy',
    price: 590,
    oldPrice: 790,
    stock: 41,
    weight: '12 x 40 г',
    flavors: ['Цитрус', 'Вишня'],
    form: 'Рідина',
    goals: ['energy'],
    description: 'Гелі з кофеїном для довгих забігів і велозаїздів. Швидка енергія без зупинки.',
    soldCount: 96,
  },
  {
    name: 'Caffeine 200 mg Tablets',
    brand: 'MyProtein',
    category: 'energy',
    price: 299,
    stock: 92,
    weight: '100 таблеток',
    form: 'Таблетки',
    goals: ['energy'],
    description: 'Найпростіший і найдешевший спосіб отримати робочу дозу кофеїну перед тренуванням.',
    soldCount: 224,
  },

  /* --------------------------- аксесуари / шейкери / одяг --------------------- */
  {
    name: `Шейкер ${HOUSE_SHORT} Pro 700 мл`,
    brand: HOUSE_BRAND,
    category: 'shakers',
    price: 349,
    oldPrice: 449,
    stock: 120,
    weight: '700 мл',
    flavors: ['Чорний', 'Лаймовий', 'Білий'],
    form: 'Аксесуар',
    goals: [],
    description:
      'Герметична кришка, металева пружина-змішувач, матовий корпус без запаху. Не протікає в сумці — перевірено.',
    specs: [
      ['Об’єм', '700 мл'],
      ['Матеріал', 'BPA-free пластик'],
    ],
    isBestseller: true,
    soldCount: 487,
  },
  {
    name: 'Шейкер зі сталевим корпусом 600 мл',
    brand: HOUSE_BRAND,
    category: 'shakers',
    price: 649,
    stock: 34,
    weight: '600 мл',
    flavors: ['Сталевий', 'Чорний'],
    form: 'Аксесуар',
    goals: [],
    description: 'Нержавіюча сталь із подвійною стінкою: тримає температуру напою до 6 годин.',
    isNew: true,
    soldCount: 71,
  },
  {
    name: 'Пояс атлетичний шкіряний',
    brand: HOUSE_BRAND,
    category: 'accessories',
    price: 1290,
    stock: 22,
    weight: 'M / L / XL',
    weights: ['M', 'L', 'XL'],
    form: 'Аксесуар',
    goals: ['strength'],
    description: 'Шкіряний пояс 10 мм для присідань і тяг. Тримає спину там, де вага стає серйозною.',
    soldCount: 63,
  },
  {
    name: 'Бинти кистьові 45 см',
    brand: 'Trec Nutrition',
    category: 'accessories',
    price: 449,
    stock: 48,
    weight: '45 см',
    form: 'Аксесуар',
    goals: ['strength'],
    description: 'Щільні бинти середньої жорсткості для жимів і роботи з великою вагою.',
    soldCount: 87,
  },
  {
    name: 'Лямки для тяги неопренові',
    brand: HOUSE_BRAND,
    category: 'accessories',
    price: 299,
    stock: 64,
    form: 'Аксесуар',
    goals: ['strength'],
    description: 'Коли хват здається раніше за спину. Неопренова підкладка не ріже долоню.',
    soldCount: 112,
  },
  {
    name: `Футболка ${HOUSE_SHORT} Oversize`,
    brand: HOUSE_BRAND,
    category: 'apparel',
    price: 749,
    oldPrice: 899,
    stock: 55,
    weight: 'S / M / L / XL',
    weights: ['S', 'M', 'L', 'XL'],
    flavors: ['Чорний', 'Графіт', 'Молочний'],
    form: 'Аксесуар',
    goals: [],
    description:
      'Щільний бавовняний трикотаж 220 г/м², прямий oversize-крій, мінімальний принт на грудях.',
    isNew: true,
    soldCount: 96,
  },
  {
    name: `Худі ${HOUSE_SHORT} Heavy`,
    brand: HOUSE_BRAND,
    category: 'apparel',
    price: 1690,
    stock: 27,
    weight: 'S / M / L / XL',
    weights: ['S', 'M', 'L', 'XL'],
    flavors: ['Чорний', 'Графіт'],
    form: 'Аксесуар',
    goals: [],
    description: 'Худі з футером 340 г/м² — для розминки в холодному залі й для життя поза ним.',
    soldCount: 44,
  },
  {
    name: 'Рукавички для залу Grip Pro',
    brand: 'Weider',
    category: 'accessories',
    price: 549,
    stock: 43,
    weight: 'M / L / XL',
    weights: ['M', 'L', 'XL'],
    form: 'Аксесуар',
    goals: [],
    description: 'Відкриті рукавички з силіконовим протектором долоні. Проти мозолів і сповзання хвату.',
    soldCount: 79,
  },
];

/* -------------------------------- templates -------------------------------- */

const COMPOSITION: Record<string, string> = {
  Порошок:
    'Концентрат/ізолят білка, какао або натуральний ароматизатор, лецитин (емульгатор), сукралоза (підсолоджувач), травні ферменти. Може містити слідові кількості лактози, глютену та сої.',
  Капсули:
    'Активна речовина, мікрокристалічна целюлоза (наповнювач), магній стеарат (антизлежувач), желатинова капсульна оболонка.',
  Таблетки:
    'Активні речовини, мікрокристалічна целюлоза, стеаринова кислота, кроскармелоза натрію, плівкове покриття.',
  Рідина: 'Очищена вода, активна речовина, регулятор кислотності, натуральний ароматизатор, консервант.',
  Батончик:
    'Білкова суміш (молочний та сироватковий білок), пребіотичний сироп, какао-масло, горіхи, підсолоджувачі. Може містити слідові кількості горіхів.',
  Аксесуар: 'Матеріал виробу вказано в характеристиках. Не містить BPA.',
};

const USAGE: Record<string, string> = {
  Порошок:
    'Розмішати одну порцію (мірна ложка в упаковці) у 250–300 мл води або молока. Приймати одразу після тренування, а в дні відпочинку — між основними прийомами їжі.',
  Капсули: 'Приймати 1–2 капсули на день під час їжі, запиваючи достатньою кількістю води.',
  Таблетки: 'Приймати згідно з рекомендованою добовою порцією під час або після їжі.',
  Рідина: 'Приймати одну ампулу/порцію за 20–30 хвилин до тренування.',
  Батончик: 'Один батончик як перекус між прийомами їжі або за 40–60 хвилин до тренування.',
  Аксесуар: 'Перед першим використанням промити теплою водою. Не використовувати посудомийну машину.',
};

const REVIEW_TEXTS = [
  'Беру вже третю банку. Розчиняється без осаду, смак не приторний — саме те, що шукав.',
  'Ціна/якість — найкраще, що знайшов на ринку. Результат за місяць помітний.',
  'Смак нормальний, але дозатор трохи незручний. За ефектом претензій немає.',
  'Замовлення прийшло на другий день, упаковка ціла. Продукт оригінальний, захист перевірив.',
  'Працює. Силові пішли вгору, відновлення після важких тренувань стало швидшим.',
  'Непогано, але очікував трохи більшого від складу за ці гроші.',
  'Користуюсь постійно, жодних побічних. Рекомендую для щоденного приймання.',
  'Взяв на пораду тренера і не пожалів. Другий місяць — все стабільно.',
];

/* ---------------------------------- helpers -------------------------------- */

function pick<T>(list: readonly T[], index: number): T {
  return list[index % list.length];
}

async function main() {
  // Deploys run the seed on every build, but it is destructive. With this flag
  // it becomes a first-run bootstrap: an already-populated database is left
  // untouched, so real orders survive the next deploy.
  if (process.env.SEED_ONLY_IF_EMPTY === 'true') {
    const existing = await prisma.product.count();
    if (existing > 0) {
      console.log(`• База вже містить ${existing} товар(ів) — сід пропущено.`);
      return;
    }
  }

  console.log('→ Очищення бази…');
  // Child rows first so no foreign key is left dangling.
  await prisma.orderNote.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.review.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.address.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.user.deleteMany();
  await prisma.setting.deleteMany();

  /* --------------------------------- taxonomy -------------------------------- */

  console.log('→ Категорії та бренди…');
  const categoryIdBySlug = new Map<string, number>();

  for (const [index, category] of CATEGORIES.entries()) {
    const parent = await prisma.category.create({
      data: {
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        sortOrder: index,
      },
    });
    categoryIdBySlug.set(parent.slug, parent.id);

    for (const [childIndex, child] of (category.children ?? []).entries()) {
      const created = await prisma.category.create({
        data: {
          name: child.name,
          slug: child.slug,
          parentId: parent.id,
          sortOrder: childIndex,
          icon: category.icon,
        },
      });
      categoryIdBySlug.set(created.slug, created.id);
    }
  }

  const brandIdByName = new Map<string, number>();
  for (const brand of BRANDS) {
    const created = await prisma.brand.create({
      data: { name: brand.name, slug: slugify(brand.name), country: brand.country },
    });
    brandIdByName.set(brand.name, created.id);
  }

  /* --------------------------------- products -------------------------------- */

  console.log('→ Товари…');
  const productIds: number[] = [];

  for (const [index, item] of PRODUCTS.entries()) {
    const categoryId = categoryIdBySlug.get(item.category);
    const brandId = brandIdByName.get(item.brand);
    if (!categoryId || !brandId) {
      throw new Error(`Seed data references an unknown category/brand: ${item.name}`);
    }

    const categoryName =
      CATEGORIES.find((category) => category.slug === item.category)?.name ??
      CATEGORIES.flatMap((category) => category.children ?? []).find(
        (child) => child.slug === item.category,
      )?.name ??
      '';

    const flavors = item.flavors ?? [];
    const derived = derivedProductFields({
      name: item.name,
      price: item.price,
      oldPrice: item.oldPrice ?? null,
      brandName: item.brand,
      categoryName,
      flavors,
      description: item.description,
    });

    // Stagger creation dates so "за новизною" sorting has something to sort.
    const createdAt = new Date(Date.now() - (PRODUCTS.length - index) * 36 * 60 * 60 * 1000);

    const product = await prisma.product.create({
      data: {
        ...derived,
        name: item.name,
        slug: slugify(`${item.brand} ${item.name}`),
        description: item.description,
        composition: COMPOSITION[item.form] ?? '',
        usage: USAGE[item.form] ?? '',
        stock: item.stock,
        brandId,
        categoryId,
        weight: item.weight ?? null,
        flavor: flavors[0] ?? null,
        form: item.form,
        weights: JSON.stringify(item.weights ?? (item.weight ? [item.weight] : [])),
        flavors: JSON.stringify(flavors),
        goals: JSON.stringify(item.goals),
        images: JSON.stringify([]),
        specs: JSON.stringify(
          (item.specs ?? []).map(([label, value]) => ({ label, value })),
        ),
        soldCount: item.soldCount ?? 0,
        isNew: item.isNew ?? false,
        isBestseller: item.isBestseller ?? false,
        isFeatured: item.isFeatured ?? false,
        // House-brand products would otherwise repeat the shop name twice.
        seoTitle:
          item.brand === HOUSE_BRAND
            ? `${item.name} | Купити в ${SHOP_NAME}`
            : `${item.name} — ${item.brand} | Купити в ${SHOP_NAME}`,
        seoDescription: item.description.slice(0, 155),
        createdAt,
      },
    });

    productIds.push(product.id);
  }

  /* ---------------------------------- users ---------------------------------- */

  console.log('→ Користувачі…');
  const hash = (value: string) => bcrypt.hashSync(value, 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Олександр Ковальчук',
      email: process.env.SEED_ADMIN_EMAIL ?? `admin@${SHOP_DOMAIN}`,
      phone: '+380671234567',
      password: hash(process.env.SEED_ADMIN_PASSWORD ?? 'Admin1234'),
      role: 'ADMIN',
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: 'Ірина Мельник',
      email: process.env.SEED_MANAGER_EMAIL ?? `manager@${SHOP_DOMAIN}`,
      phone: '+380501112233',
      password: hash(process.env.SEED_MANAGER_PASSWORD ?? 'Manager1234'),
      role: 'MANAGER',
    },
  });

  const manager2 = await prisma.user.create({
    data: {
      name: 'Дмитро Бондаренко',
      email: `manager2@${SHOP_DOMAIN}`,
      phone: '+380504445566',
      password: hash('Manager1234'),
      role: 'MANAGER',
    },
  });

  const client = await prisma.user.create({
    data: {
      name: 'Андрій Шевченко',
      email: process.env.SEED_CLIENT_EMAIL ?? `client@${SHOP_DOMAIN}`,
      phone: '+380931234567',
      password: hash(process.env.SEED_CLIENT_PASSWORD ?? 'Client1234'),
      role: 'CLIENT',
      addresses: {
        create: [
          {
            label: 'Дім',
            city: 'Київ',
            warehouse: 'Відділення №12 (вул. Хрещатик, 22)',
            recipient: 'Андрій Шевченко',
            phone: '+380931234567',
            isDefault: true,
          },
          {
            label: 'Робота',
            city: 'Київ',
            warehouse: 'Поштомат №45821 (БЦ Gulliver)',
          },
        ],
      },
    },
  });

  const extraClients = await Promise.all(
    [
      { name: 'Марія Литвин', email: 'maria@example.com', phone: '+380671110022' },
      { name: 'Тарас Гриценко', email: 'taras@example.com', phone: '+380672220033' },
      { name: 'Олена Кравець', email: 'olena@example.com', phone: '+380673330044' },
      { name: 'Віктор Пономаренко', email: 'viktor@example.com', phone: '+380674440055' },
    ].map((data) =>
      prisma.user.create({
        data: { ...data, password: hash('Client1234'), role: 'CLIENT' },
      }),
    ),
  );

  const clients = [client, ...extraClients];

  /* --------------------------------- favorites ------------------------------- */

  await prisma.favorite.createMany({
    data: [productIds[0], productIds[8], productIds[21]].map((productId) => ({
      userId: client.id,
      productId,
    })),
  });

  /* ---------------------------------- reviews -------------------------------- */

  console.log('→ Відгуки…');
  let reviewSeed = 0;
  for (const [index, productId] of productIds.entries()) {
    // Not every product gets reviews — empty states need to be reachable too.
    if (index % 3 === 2) continue;

    const reviewers = clients.slice(0, (index % 3) + 1);
    for (const reviewer of reviewers) {
      const rating = [5, 5, 4, 5, 4, 3][reviewSeed % 6];
      await prisma.review.create({
        data: {
          userId: reviewer.id,
          productId,
          rating,
          text: pick(REVIEW_TEXTS, reviewSeed),
          createdAt: new Date(Date.now() - (reviewSeed % 40) * 24 * 60 * 60 * 1000),
        },
      });
      reviewSeed += 1;
    }

    const stats = await prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await prisma.product.update({
      where: { id: productId },
      data: {
        rating: Math.round((stats._avg.rating ?? 0) * 10) / 10,
        reviewCount: stats._count._all,
      },
    });
  }

  /* ---------------------------------- orders --------------------------------- */

  console.log('→ Замовлення…');
  const ORDER_PLAN: {
    status: string;
    customer: (typeof clients)[number] | null;
    managerId: number | null;
    items: [number, number][]; // [product index, quantity]
    daysAgo: number;
    delivery: string;
    payment: string;
    note?: string;
  }[] = [
    { status: 'NEW', customer: clients[0], managerId: null, items: [[0, 1], [8, 2]], daysAgo: 0, delivery: 'NOVA_POSHTA', payment: 'COD' },
    { status: 'NEW', customer: null, managerId: null, items: [[21, 1], [36, 1]], daysAgo: 0, delivery: 'NOVA_POSHTA', payment: 'ONLINE' },
    { status: 'CONFIRMING', customer: clients[1], managerId: manager.id, items: [[1, 1]], daysAgo: 1, delivery: 'NOVA_POSHTA', payment: 'ONLINE', note: 'Клієнт просив передзвонити після 18:00.' },
    { status: 'PROCESSING', customer: clients[2], managerId: manager.id, items: [[12, 1], [25, 2], [40, 1]], daysAgo: 2, delivery: 'NOVA_POSHTA', payment: 'COD', note: 'Додати пробник передтренувального до посилки.' },
    { status: 'PROCESSING', customer: clients[0], managerId: manager2.id, items: [[3, 2]], daysAgo: 3, delivery: 'PICKUP', payment: 'COD' },
    { status: 'SHIPPED', customer: clients[3], managerId: manager.id, items: [[9, 1], [30, 1]], daysAgo: 4, delivery: 'NOVA_POSHTA', payment: 'ONLINE' },
    { status: 'SHIPPED', customer: clients[1], managerId: manager2.id, items: [[35, 1], [43, 2]], daysAgo: 5, delivery: 'NOVA_POSHTA', payment: 'COD' },
    { status: 'COMPLETED', customer: clients[0], managerId: manager.id, items: [[0, 1], [26, 1], [31, 1]], daysAgo: 9, delivery: 'NOVA_POSHTA', payment: 'ONLINE' },
    { status: 'COMPLETED', customer: clients[2], managerId: manager.id, items: [[4, 1]], daysAgo: 12, delivery: 'NOVA_POSHTA', payment: 'ONLINE' },
    { status: 'COMPLETED', customer: clients[3], managerId: manager2.id, items: [[13, 1], [22, 1]], daysAgo: 15, delivery: 'PICKUP', payment: 'COD' },
    { status: 'COMPLETED', customer: clients[4], managerId: manager.id, items: [[8, 3]], daysAgo: 18, delivery: 'NOVA_POSHTA', payment: 'COD' },
    { status: 'CANCELLED', customer: clients[1], managerId: manager2.id, items: [[5, 1]], daysAgo: 7, delivery: 'NOVA_POSHTA', payment: 'COD', note: 'Клієнт відмовився — знайшов дешевше.' },
  ];

  for (const [index, plan] of ORDER_PLAN.entries()) {
    const products = await prisma.product.findMany({
      where: { id: { in: plan.items.map(([productIndex]) => productIds[productIndex]) } },
    });
    const byId = new Map(products.map((product) => [product.id, product]));

    const items = plan.items.map(([productIndex, quantity]) => {
      const product = byId.get(productIds[productIndex])!;
      return {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        image: product.image,
        price: product.price,
        quantity,
        weight: product.weight,
        flavor: product.flavor,
      };
    });

    const subtotal = Math.round(
      items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100,
    ) / 100;

    const customer = plan.customer;
    const [firstName, lastName] = (customer?.name ?? 'Гість Магазину').split(' ');
    const createdAt = new Date(Date.now() - plan.daysAgo * 24 * 60 * 60 * 1000);

    const order = await prisma.order.create({
      data: {
        number: 1048 + index,
        userId: customer?.id ?? null,
        managerId: plan.managerId,
        status: plan.status,
        subtotal,
        total: subtotal,
        deliveryMethod: plan.delivery,
        paymentMethod: plan.payment,
        firstName: lastName ? firstName : 'Гість',
        lastName: lastName ?? 'Магазину',
        phone: customer?.phone ?? '+380990001122',
        email: customer?.email ?? 'guest@example.com',
        city: plan.delivery === 'PICKUP' ? 'Київ' : 'Київ',
        warehouse:
          plan.delivery === 'PICKUP'
            ? 'Самовивіз: вул. Спортивна 1, Київ'
            : 'Відділення №12 (вул. Хрещатик, 22)',
        createdAt,
        updatedAt: createdAt,
        items: { create: items },
      },
    });

    if (plan.note) {
      await prisma.orderNote.create({
        data: {
          orderId: order.id,
          authorId: plan.managerId ?? manager.id,
          text: plan.note,
          createdAt,
        },
      });
    }
  }

  /* --------------------------------- settings -------------------------------- */

  await prisma.setting.createMany({
    data: [
      { key: 'shopName', value: SHOP_NAME },
      { key: 'supportPhone', value: '+380 44 123 45 67' },
      { key: 'supportEmail', value: `support@${SHOP_DOMAIN}` },
      { key: 'freeDeliveryFrom', value: '1500' },
      { key: 'lowStockThreshold', value: '10' },
      { key: 'announcement', value: 'Безкоштовна доставка від 1500 ₴ • Оригінальні бренди' },
    ],
  });

  const counts = {
    categories: await prisma.category.count(),
    brands: await prisma.brand.count(),
    products: await prisma.product.count(),
    users: await prisma.user.count(),
    orders: await prisma.order.count(),
    reviews: await prisma.review.count(),
  };

  console.log('\n✓ База заповнена:', counts);
  console.log('\n  Доступи для входу:');
  console.log(`  ADMIN    ${admin.email} / ${process.env.SEED_ADMIN_PASSWORD ?? 'Admin1234'}`);
  console.log(`  MANAGER  ${manager.email} / ${process.env.SEED_MANAGER_PASSWORD ?? 'Manager1234'}`);
  console.log(`  CLIENT   ${client.email} / ${process.env.SEED_CLIENT_PASSWORD ?? 'Client1234'}\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
