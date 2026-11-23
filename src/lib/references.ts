/**
 * 生涯報告「這些建議依據哪類研究？」的參考文獻（APA 7）
 * 來源：研究筆記〈先分類再介入：CDDQ 施測後的處置路徑〉引用的研究。
 * 書目資料於 2026-11-18 以 Crossref（DOI）與華藝線上圖書館核對；查不到完整書目的文獻（碩士論文、韓文與部分中文期刊）暫不列入。
 */
export type Reference = {
  authors: string;
  year: string;
  title: string;
  /** 期刊或書名（斜體） */
  source: string;
  volume?: string;
  issue?: string;
  pages?: string;
  /** 書籍章節：「In 編者 (Eds.), 」放在書名前 */
  inBook?: string;
  publisher?: string;
  doi?: string;
  note?: string;
  /** 分組：判讀與量表／介入效果／台灣與華人脈絡 */
  group: "assessment" | "intervention" | "culture";
};

export const REFERENCE_GROUPS: Record<Reference["group"], string> = {
  assessment: "困難的分類與判讀",
  intervention: "生涯介入的效果與有效成分",
  culture: "台灣與華人學生的研究",
};

export const REFERENCES: Reference[] = [
  // ─── 困難的分類與判讀 ───
  { group: "assessment", authors: "Amir, T., Gati, I., & Kleiman, T.", year: "2008", title: "Understanding and interpreting career decision-making difficulties", source: "Journal of Career Assessment", volume: "16", issue: "3", pages: "281–309", doi: "10.1177/1069072708317367" },
  { group: "assessment", authors: "Gati, I., Amir, T., & Landman, S.", year: "2010", title: "Career counsellors' perceptions of the severity of career decision-making difficulties", source: "British Journal of Guidance & Counselling", volume: "38", issue: "4", pages: "393–408", doi: "10.1080/03069885.2010.503700" },
  { group: "assessment", authors: "Gati, I., Kleiman, T., Saka, N., & Zakai, A.", year: "2003", title: "Perceived benefits of using an Internet-based interactive career planning system", source: "Journal of Vocational Behavior", volume: "62", issue: "2", pages: "272–286", doi: "10.1016/S0001-8791(02)00049-0" },
  { group: "assessment", authors: "Gati, I., Krausz, M., & Osipow, S. H.", year: "1996", title: "A taxonomy of difficulties in career decision making", source: "Journal of Counseling Psychology", volume: "43", issue: "4", pages: "510–526", doi: "10.1037/0022-0167.43.4.510" },
  { group: "assessment", authors: "Gati, I., & Levin, N.", year: "2014", title: "Counseling for career decision-making difficulties: Measures and methods", source: "The Career Development Quarterly", volume: "62", issue: "2", pages: "98–113", doi: "10.1002/j.2161-0045.2014.00073.x" },
  { group: "assessment", authors: "Saka, N., Gati, I., & Kelly, K. R.", year: "2008", title: "Emotional and personality-related aspects of career-decision-making difficulties", source: "Journal of Career Assessment", volume: "16", issue: "4", pages: "403–424", doi: "10.1177/1069072708318900" },

  // ─── 介入效果與有效成分 ───
  { group: "intervention", authors: "Brown, S. D., & Ryan Krane, N. E.", year: "2000", title: "Four (or five) sessions and a cloud of dust: Old assumptions and new observations about career counseling", inBook: "S. D. Brown & R. W. Lent (Eds.),", source: "Handbook of counseling psychology", pages: "740–766", publisher: "Wiley", note: "3rd ed." },
  { group: "intervention", authors: "Langher, V., Nannini, V., & Caputo, A.", year: "2018", title: "What do university or graduate students need to make the cut? A meta-analysis on career intervention effectiveness", source: "Journal of Educational, Cultural and Psychological Studies", issue: "17", doi: "10.7358/ecps-2018-017-lang" },
  { group: "intervention", authors: "Oliver, L. W., & Spokane, A. R.", year: "1988", title: "Career-intervention outcome: What contributes to client gain?", source: "Journal of Counseling Psychology", volume: "35", issue: "4", pages: "447–462", doi: "10.1037/0022-0167.35.4.447" },
  { group: "intervention", authors: "Reed, C. A., Reardon, R. C., Lenz, J. G., & Leierer, S. J.", year: "2001", title: "A cognitive career course: From theory to practice", source: "The Career Development Quarterly", volume: "50", issue: "2", pages: "158–167", doi: "10.1002/j.2161-0045.2001.tb00980.x" },
  { group: "intervention", authors: "Wang, D., Li, Y., & Wang, G.", year: "2024", title: "A systematic review on career interventions for high school students", source: "Frontiers in Psychology", volume: "15", pages: "Article 1461503", doi: "10.3389/fpsyg.2024.1461503" },
  { group: "intervention", authors: "Whiston, S. C., Li, Y., Goodrich Mitts, N., & Wright, L.", year: "2017", title: "Effectiveness of career choice interventions: A meta-analytic replication and extension", source: "Journal of Vocational Behavior", volume: "100", pages: "175–184", doi: "10.1016/j.jvb.2017.03.010" },
  { group: "intervention", authors: "Whiston, S. C., Sexton, T. L., & Lasoff, D. L.", year: "1998", title: "Career-intervention outcome: A replication and extension of Oliver and Spokane (1988)", source: "Journal of Counseling Psychology", volume: "45", issue: "2", pages: "150–165", doi: "10.1037/0022-0167.45.2.150" },

  // ─── 台灣與華人學生 ───
  { group: "culture", authors: "Leung, S. A., Hou, Z.-J., Gati, I., & Li, X.", year: "2011", title: "Effects of parental expectations and cultural-values orientation on career decision-making difficulties of Chinese university students", source: "Journal of Vocational Behavior", volume: "78", issue: "1", pages: "11–20", doi: "10.1016/j.jvb.2010.08.004" },
  { group: "culture", authors: "Li, S., & Pan, Q.", year: "2026", title: "Xin-Yang and career-related decision-making process among Chinese college student population: An intervention study", source: "Journal of Career Assessment", doi: "10.1177/10690727261460462", note: "Advance online publication" },
  { group: "culture", authors: "Mao, C.-H., Hsu, Y.-C., & Fang, T.-W.", year: "2017", title: "Mediating effect of career decision self-efficacy on the relationship between parental support and indecision in Taiwan", source: "Journal of Career Development", volume: "44", issue: "6", pages: "471–484", doi: "10.1177/0894845316663319" },
  { group: "culture", authors: "Mau, W.-C.", year: "2001", title: "Assessing career decision-making difficulties: A cross-cultural study", source: "Journal of Career Assessment", volume: "9", issue: "4", pages: "353–364", doi: "10.1177/106907270100900403" },
  { group: "culture", authors: "Mau, W.-C. J.", year: "2004", title: "Cultural dimensions of career decision-making difficulties", source: "The Career Development Quarterly", volume: "53", issue: "1", pages: "67–77", doi: "10.1002/j.2161-0045.2004.tb00656.x" },
  { group: "culture", authors: "Tien, H.-L. S.", year: "2005", title: "The validation of the Career Decision-Making Difficulties Scale in a Chinese culture", source: "Journal of Career Assessment", volume: "13", issue: "1", pages: "114–127", doi: "10.1177/1069072704270327" },
  { group: "culture", authors: "田秀蘭", year: "2001", title: "大專學生對生涯決定困難的知覺分析", source: "教育心理學報", volume: "33", issue: "1", pages: "87–98", doi: "10.6251/BEP.20010612" },
];
