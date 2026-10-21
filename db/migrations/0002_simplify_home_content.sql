-- 首頁文案精簡：主標題改為「歡迎來到臺大心理系，左岸計畫」，移除小標、說明文字與「關於計畫」的副標
delete from site_content where key in ('hero.eyebrow', 'hero.lead', 'about.title');
update site_content set value = '歡迎來到臺大心理系，左岸計畫', updated_at = now() where key = 'hero.tagline';
