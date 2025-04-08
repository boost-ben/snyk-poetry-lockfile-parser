import { Parser, V1Manifest } from './types';
import { Dependency, Group } from './types';
import { PkgInfo } from '@snyk/dep-graph';

export class V1Parser implements Parser {
  version = '1';
  manifest: V1Manifest;
  includeDevDependencies: boolean;

  constructor(manifest: V1Manifest, includeDevDependencies?: boolean) {
    this.manifest = manifest;
    this.includeDevDependencies = !!includeDevDependencies;
  }

  pkgInfoFrom(): PkgInfo {
    return {
      name: this.manifest.tool.poetry.name,
      version: this.manifest.tool.poetry.version,
    };
  }

  dependenciesFrom(): string[] {
    return Object.keys(this.manifest.tool.poetry.dependencies || []);
  }

  getGroupDependenciesExcludingDev(): string[] {
    if (!this.manifest.tool?.poetry.group) {
      console.log('[DEBUG-POETRY] V1Parser: No poetry groups found in manifest');
      return [];
    }

    const nonDevGroupDeps: string[] = [];
    
    console.log('[DEBUG-POETRY] V1Parser: Found poetry groups:', Object.keys(this.manifest.tool.poetry.group));
    
    Object.entries(this.manifest.tool.poetry.group).forEach(([groupName, groupData]) => {
      if (groupName.toLowerCase() !== 'dev') {
        const groupDeps = Object.keys(groupData.dependencies || {});
        console.log(`[DEBUG-POETRY] V1Parser: Group '${groupName}' has dependencies:`, groupDeps);
        nonDevGroupDeps.push(...groupDeps);
      } else {
        console.log(`[DEBUG-POETRY] V1Parser: Skipping 'dev' group dependencies`);
      }
    });
    
    console.log('[DEBUG-POETRY] V1Parser: Total non-dev group dependencies:', nonDevGroupDeps);
    return nonDevGroupDeps;
  }

  getAllDevDependencyNames(): string[] {
    const classicDevDeps = Object.keys(
      this.manifest.tool.poetry['dev-dependencies'] ?? []
    );
    
    let devGroupDeps: string[] = [];
    if (this.manifest.tool?.poetry.group?.dev?.dependencies) {
      devGroupDeps = Object.keys(this.manifest.tool.poetry.group.dev.dependencies);
    }
    
    return [...classicDevDeps, ...devGroupDeps];
  }

  getDependencies(): Dependency[] {
    console.log('[DEBUG-POETRY] V1Parser: Starting getDependencies()');
    const standardDeps = this.dependenciesFrom();
    console.log('[DEBUG-POETRY] V1Parser: Standard dependencies:', standardDeps);
    
    const nonDevGroupDeps = this.getGroupDependenciesExcludingDev();
    console.log('[DEBUG-POETRY] V1Parser: Non-dev group dependencies:', nonDevGroupDeps);
    
    const allRegularDeps = [...standardDeps, ...nonDevGroupDeps];
    console.log('[DEBUG-POETRY] V1Parser: All regular dependencies:', allRegularDeps);
    
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
    
    console.log('[DEBUG-POETRY] V1Parser: Dev dependencies:', this.includeDevDependencies ? this.getAllDevDependencyNames() : []);

    const finalDeps = [...dependencies, ...devDependencies].filter(
      (pkg) => pkg.name != 'python',
    );
    
    console.log('[DEBUG-POETRY] V1Parser: Final dependencies:', finalDeps.map(d => d.name));
    return finalDeps;
  }
}
