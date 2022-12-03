import {NgDocPage} from '@ng-doc/builder';

import EntitiesCategory from '../ng-doc.category';

export const CategoryPage: NgDocPage = {
	title: 'Category',
	mdFile: './index.md',
	category: EntitiesCategory,
	order: 2,
	keyword: 'EntitiesCategory'
};

export default CategoryPage;