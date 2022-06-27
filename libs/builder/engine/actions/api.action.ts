import {ClassDeclaration, Node, Project} from 'ts-morph';

import {findDeclaration} from '../../helpers';
import {NgDocActionOutput} from '../../interfaces';
import {NgDocApiEnv} from '../../templates-env/api.env';
import {NgDocAction} from '../../types';
import {NgDocPageEntity} from '../entities/page';
import {NgDocRenderer} from '../renderer';

/**
 *	Render API table for typescript object
 *
 * @param {string} sourcePath - Path to typescript file
 * @returns {NgDocAction} - The action output
 */
export function apiAction(sourcePath: string): NgDocAction {
	return (project: Project, page: NgDocPageEntity): NgDocActionOutput => {
		try {
			const declaration: Node = findDeclaration(project, page, sourcePath);
			const renderer: NgDocRenderer<NgDocApiEnv> = new NgDocRenderer<NgDocApiEnv>({
				Node,
				declaration,
			});

			console.log((declaration as ClassDeclaration).getStructure());

			return {
				output: renderer.renderSync('actions/api.md.nunj'),
				dependencies: [declaration.getSourceFile().getFilePath()],
			};
		} catch (e) {
			page.builderContext.context.logger.error(`Error while executing API action: ${e}`);

			return {output: ``};
		}
	};
}