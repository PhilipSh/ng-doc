import {json} from '@angular-devkit/core';

export interface NgDocSchema extends json.JsonObject {
	browserTarget: string;
	ngDoc: {
		pages: string[];
		tsConfig: string;
		tag: string;
	};
}