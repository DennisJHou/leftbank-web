-- 首頁文案更新（副標、計畫理念、三重困境）。新建的資料庫會直接用 site-content-defaults.ts；已存在的資料庫要靠這支 SQL 才會換成新文字，因為預設值只補上缺少的 key
update site_content set value = '以對話作為方法，探尋心理學的社會實踐', updated_at = now() where key = 'hero.subtitle';
update site_content set value = '「左岸」源自巴黎塞納河南岸。二十世紀中葉，花神與雙叟咖啡館裡的知識分子走出書齋，在公共場域透過對話，把深奧的理論轉化為對社會的反思。

對話，正是左岸精神的核心：讓思想與真實生活產生摩擦，才能迸發改變的動能。

左岸計畫的發起人是兩位台大的研究生，我們想要重新串起三種力量：學術界的知識、系友在業界看見的真實問題，以及學生的好奇與熱血，並創造它們的交集。

我們希望透過邀請系友座談、對話、分享生命經驗的方式，一起探尋心理學在社會上扎根茁壯的可能。

誠摯邀請您，一起加入左岸。', updated_at = now() where key = 'about.spirit';
update site_content set value = '從心理人的未竟之志談起', updated_at = now() where key = 'about.dilemmas.title';
update site_content set value = '走出校園後，在各個產業前線深耕多年。心中始終保有對母系的深厚歸屬，渴望將真實世界的實務經驗與產業視野回饋學弟妹，卻長年缺乏一個有溫度且能持續深談的對接場域。', updated_at = now() where key = 'about.dilemma1.text';
update site_content set value = '在厚重的理論與研究方法中載浮載沉。隨著畢業腳步逼近，一邊驚嘆於心理學知識的博大，一邊卻在象牙塔與職場接軌的縫隙中感到迷惘——空有滿腔熱忱與專業，卻看不清社會何處需要自己。', updated_at = now() where key = 'about.dilemma2.text';
update site_content set value = '心理學以嚴謹的科學方法探索人類心智，擁有最扎實的研究底蘊與理論圖譜。然而頂尖的期刊論文往往封存於學術社群內部，如何跨出書齋、讓高深理論在真實社會中落地並發揮具體影響力，是當前學術探索的重要延伸。', updated_at = now() where key = 'about.dilemma3.text';
