import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { categoryIcon } from "@/lib/category-icons";

export function CategoryIcon({ icon, name }: { icon: string | null; name?: string }) {
  return <span className="ws-category-icon" aria-hidden="true"><FontAwesomeIcon icon={categoryIcon(icon, name)} /></span>;
}
