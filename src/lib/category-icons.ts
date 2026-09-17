import {
  faBagShopping, faBolt, faBriefcase, faBus, faCar, faCartShopping,
  faCoins, faGamepad, faGift, faGraduationCap, faHeartPulse, faHouse,
  faMoneyBillWave, faMugHot, faPhone, faPiggyBank, faPlane, faTag,
  faUtensils, type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";

export const categoryIcons: { key: string; label: string; icon: IconDefinition }[] = [
  { key: "tag", label: "Umum", icon: faTag },
  { key: "utensils", label: "Makan", icon: faUtensils },
  { key: "mug-hot", label: "Minuman", icon: faMugHot },
  { key: "cart-shopping", label: "Belanja harian", icon: faCartShopping },
  { key: "bag-shopping", label: "Belanja", icon: faBagShopping },
  { key: "house", label: "Rumah", icon: faHouse },
  { key: "bolt", label: "Tagihan", icon: faBolt },
  { key: "phone", label: "Telepon", icon: faPhone },
  { key: "car", label: "Mobil", icon: faCar },
  { key: "bus", label: "Transportasi", icon: faBus },
  { key: "heart-pulse", label: "Kesehatan", icon: faHeartPulse },
  { key: "graduation-cap", label: "Pendidikan", icon: faGraduationCap },
  { key: "gamepad", label: "Hiburan", icon: faGamepad },
  { key: "plane", label: "Perjalanan", icon: faPlane },
  { key: "gift", label: "Hadiah", icon: faGift },
  { key: "briefcase", label: "Pekerjaan", icon: faBriefcase },
  { key: "money-bill-wave", label: "Penghasilan", icon: faMoneyBillWave },
  { key: "coins", label: "Uang", icon: faCoins },
  { key: "piggy-bank", label: "Tabungan", icon: faPiggyBank },
];

export function isCategoryIcon(value: string): boolean {
  return categoryIcons.some((item) => item.key === value);
}

export function suggestedCategoryIcon(name: string): string {
  const normalized = name.toLowerCase();
  if (/makan|food|snack|restoran/.test(normalized)) return "utensils";
  if (/ngopi|coffee|kopi|cafe/.test(normalized)) return "mug-hot";
  if (/bensin|fuel|parkir|motor|mobil/.test(normalized)) return "car";
  if (/transport|bus|ojek|kereta/.test(normalized)) return "bus";
  if (/rumah|house|sewa|kontrakan/.test(normalized)) return "house";
  if (/listrik|tagihan|bill|wi-fi|internet/.test(normalized)) return "bolt";
  if (/gaji|salary|bonus|paycheck/.test(normalized)) return "money-bill-wave";
  if (/invest|reimburse|cashback/.test(normalized)) return "coins";
  if (/kesehatan|health|dokter|obat/.test(normalized)) return "heart-pulse";
  if (/sekolah|pendidikan|kuliah/.test(normalized)) return "graduation-cap";
  if (/hiburan|game/.test(normalized)) return "gamepad";
  if (/travel|liburan|pesawat/.test(normalized)) return "plane";
  if (/gift|hadiah/.test(normalized)) return "gift";
  if (/kerja|work|freelance|jasa/.test(normalized)) return "briefcase";
  if (/belanja|shopping|market/.test(normalized)) return "cart-shopping";
  return "tag";
}

export function categoryIcon(value: string | null, name = ""): IconDefinition {
  return categoryIcons.find((item) => item.key === (value ?? suggestedCategoryIcon(name)))?.icon ?? faTag;
}
