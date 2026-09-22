import { Directory } from "@/components/directory";
import { seedCreators } from "@/data/creators";

export default function HomePage() {
  return <Directory seed={seedCreators} />;
}
