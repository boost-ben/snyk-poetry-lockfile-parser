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
      return [];
    }

    const nonDevGroupDeps: string[] = [];
    
    Object.entries(this.manifest.tool.poetry.group).forEach(([groupName, groupData]) => {
      if (groupName.toLowerCase() !== 'dev') {
        const groupDeps = Object.keys(groupData.dependencies || {});
        nonDevGroupDeps.push(...groupDeps);
      }
    });
    
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
    const standardDeps = this.dependenciesFrom();
    const nonDevGroupDeps = this.getGroupDependenciesExcludingDev();
    const allRegularDeps = [...standardDeps, ...nonDevGroupDeps];
    
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

    return [...dependencies, ...devDependencies].filter(
      (pkg) => pkg.name != 'python',
    );
  }
}
