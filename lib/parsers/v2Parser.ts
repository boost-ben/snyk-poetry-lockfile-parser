import { Dependency, Group, Parser, V2Manifest } from './types';
import { PkgInfo } from '@snyk/dep-graph';

export class V2Parser implements Parser {
  version = '2';
  manifest: V2Manifest;
  includeDevDependencies: boolean;

  constructor(manifest: V2Manifest, includeDevDependencies?: boolean) {
    this.manifest = manifest;
    this.includeDevDependencies = !!includeDevDependencies;
  }

  pkgInfoFrom(): PkgInfo {
    return {
      name: this.manifest.project.name,
      version: this.manifest.project.version,
    };
  }

  dependenciesFrom(): string[] {
    const depsRegex = /^[a-zA-Z][a-zA-Z0-9_-]*/;
    const deps = this.manifest.project.dependencies || [];
    const newFormatDeps =
      deps
        .map((dep) => dep.match(depsRegex)?.[0])
        .filter((dep) => typeof dep === 'string') || [];
    const legacyFormatDeps = Object.keys(
      this.manifest.tool?.poetry?.dependencies || [],
    );
    return [...newFormatDeps, ...legacyFormatDeps];
  }

  getGroupDependenciesExcludingDev(): string[] {
    if (!this.manifest.tool?.poetry.group) {
      console.log('[DEBUG-POETRY] V2Parser: No poetry groups found in manifest');
      return [];
    }

    const nonDevGroupDeps: string[] = [];
    
    console.log('[DEBUG-POETRY] V2Parser: Found poetry groups:', Object.keys(this.manifest.tool.poetry.group));
    
    Object.entries(this.manifest.tool.poetry.group).forEach(([groupName, groupData]) => {
      if (groupName.toLowerCase() !== 'dev') {
        const groupDeps = Object.keys(groupData.dependencies || {});
        console.log(`[DEBUG-POETRY] V2Parser: Group '${groupName}' has dependencies:`, groupDeps);
        nonDevGroupDeps.push(...groupDeps);
      } else {
        console.log(`[DEBUG-POETRY] V2Parser: Skipping 'dev' group dependencies`);
      }
    });
    
    console.log('[DEBUG-POETRY] V2Parser: Total non-dev group dependencies:', nonDevGroupDeps);
    return nonDevGroupDeps;
  }

  getAllDevDependencyNames(): string[] {
    const devDepsProperty = Object.keys(
      this.manifest.tool?.poetry.group?.dev?.dependencies ?? []
    );
    
    const legacyDevDepsProperty = Object.keys(
      this.manifest.tool?.poetry['dev-dependencies'] ?? []
    );

    return [...devDepsProperty, ...legacyDevDepsProperty];
  }

  getDependencies(): Dependency[] {
    console.log('[DEBUG-POETRY] V2Parser: Starting getDependencies()');
    const standardDeps = this.dependenciesFrom();
    console.log('[DEBUG-POETRY] V2Parser: Standard dependencies:', standardDeps);
    
    const nonDevGroupDeps = this.getGroupDependenciesExcludingDev();
    console.log('[DEBUG-POETRY] V2Parser: Non-dev group dependencies:', nonDevGroupDeps);
    
    const allRegularDeps = [...standardDeps, ...nonDevGroupDeps];
    console.log('[DEBUG-POETRY] V2Parser: All regular dependencies:', allRegularDeps);
    
    const dependencies: Dependency[] = allRegularDeps.map((dep) => ({
      name: dep,
      isDev: false,
    }));
    
    const devDependencies: Dependency[] = (
      this.includeDevDependencies ? this.getAllDevDependencyNames() : []
    ).map((devDep) => ({
      name: devDep,
      isDev: true,
    }));
    
    console.log('[DEBUG-POETRY] V2Parser: Dev dependencies:', this.includeDevDependencies ? this.getAllDevDependencyNames() : []);

    const finalDeps = [...dependencies, ...devDependencies].filter(
      (pkg) => pkg.name != 'python',
    );
    
    console.log('[DEBUG-POETRY] V2Parser: Final dependencies:', finalDeps.map(d => d.name));
    return finalDeps;
  }
}
