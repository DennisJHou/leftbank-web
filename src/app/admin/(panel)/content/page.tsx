import { requireAdmin } from "@/lib/admin-auth";
import { getSiteContent } from "@/lib/queries";
import { PageTitle } from "../../ui";
import { ContentForm, HeroImageForm } from "./ContentForms";

export const metadata = { title: "首頁內容" };

export default async function ContentAdmin() {
  await requireAdmin();
  const values = await getSiteContent();
  return (
    <div className="max-w-3xl">
      <PageTitle title="首頁內容" lead="修改後立即生效。">
        <a href="/#about" target="_blank" className="btn btn-sm text-stone">看首頁 ↗</a>
      </PageTitle>
      <div className="space-y-10">
        <HeroImageForm current={values["hero.image"]} />
        <ContentForm values={values} />
      </div>
    </div>
  );
}
