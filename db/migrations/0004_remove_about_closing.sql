-- 移除「計畫理念」下方的引言（空字串＝不顯示）
update site_content set value = '', updated_at = now() where key = 'about.closing';
