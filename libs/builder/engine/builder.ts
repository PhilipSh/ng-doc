import * as path from 'path';
import {forkJoin, Observable} from 'rxjs';
import {concatMap, map, mapTo, tap} from 'rxjs/operators';
import {Project, SourceFile} from 'ts-morph';

import {asArray, createProject, emitBuildedOutput} from '../helpers';
import {getEntityConstructor} from '../helpers/get-entity-constructor';
import {NgDocBuildedOutput, NgDocBuilderContext} from '../interfaces';
import {bufferDebounce} from '../operators';
import {NgDocContextEnv, NgDocRoutingEnv} from '../templates-env';
import {Constructable} from '../types';
import {NgDocEntity} from './entities/abstractions/entity';
import {NgDocEntityStore} from './entity-store';
import {NgDocRenderer} from './renderer';
import {
	API_PATTERN,
	CACHE_PATH,
	CATEGORY_PATTERN,
	GENERATED_PATH,
	PAGE_DEPENDENCY_PATTERN,
	PAGE_PATTERN,
} from './variables';
import {NgDocWatcher} from './watcher';

export class NgDocBuilder {
	private readonly project: Project;
	private readonly entities: NgDocEntityStore;
	private readonly watcher: NgDocWatcher;

	constructor(private readonly context: NgDocBuilderContext) {
		this.project = createProject({
			tsConfigFilePath: this.context.options.ngDoc.tsConfig,
			compilerOptions: {
				rootDir: this.context.context.workspaceRoot,
				outDir: CACHE_PATH,
			},
		});

		this.entities = new NgDocEntityStore();

		this.watcher = new NgDocWatcher(
			asArray(this.context.options.ngDoc.pages)
				.map((pagesPath: string) => [
					path.join(pagesPath, PAGE_PATTERN),
					path.join(pagesPath, CATEGORY_PATTERN),
					path.join(pagesPath, PAGE_DEPENDENCY_PATTERN),
					path.join(pagesPath, API_PATTERN),
				])
				.flat(),
		);

		this.watcher.add
			.pipe(
				map((paths: string[]) =>
					paths.map((sourceFilePath: string) => {
						const Constructor: Constructable<NgDocEntity> = getEntityConstructor(sourceFilePath);
						const sourceFile: SourceFile = this.project.addSourceFileAtPath(sourceFilePath);

						return new Constructor(this.project, sourceFile, this.context, this.entities);
					}),
				),
			)
			.subscribe();
	}

	run(): Observable<void> {
		console.time('Build documentation');
		return this.entities.changes.pipe(
			bufferDebounce(20),
			concatMap((entities: NgDocEntity[][]) => this.build(...asArray(new Set(entities.flat())))),
			tap(() => console.timeEnd('Build documentation')),
		);
	}

	build(...changedEntities: NgDocEntity[]): Observable<void> {
		this.context.context.reportStatus('Building documentation...');

		return forkJoin([
			...changedEntities
				.filter((entity: NgDocEntity) => entity.isReadyToBuild)
				.map((entity: NgDocEntity) => entity.build()),
			this.buildRoutes(),
			this.buildContext(),
		]).pipe(
			map((output: Array<NgDocBuildedOutput | NgDocBuildedOutput[]>) => output.flat()),
			tap((output: NgDocBuildedOutput[]) => emitBuildedOutput(...output)),
			mapTo(void 0),
			tap(() => console.log('asd')),
		);
	}

	private buildRoutes(): Observable<NgDocBuildedOutput> {
		const entities: NgDocEntity[] = this.entities.rootEntitiesForBuild;
		const renderer: NgDocRenderer<NgDocRoutingEnv> = new NgDocRenderer<NgDocRoutingEnv>({entities});

		return renderer
			.render('ng-doc.routing.ts.nunj')
			.pipe(map((output: string) => ({output, filePath: path.join(GENERATED_PATH, 'ng-doc.routing.ts')})));
	}

	private buildContext(): Observable<NgDocBuildedOutput> {
		const entities: NgDocEntity[] = this.entities.rootEntitiesForBuild;
		const renderer: NgDocRenderer<NgDocRoutingEnv> = new NgDocRenderer<NgDocContextEnv>({entities});

		return renderer
			.render('ng-doc.context.ts.nunj')
			.pipe(map((output: string) => ({output, filePath: path.join(GENERATED_PATH, 'ng-doc.context.ts')})));
	}
}
