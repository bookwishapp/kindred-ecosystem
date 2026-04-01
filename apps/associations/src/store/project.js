// Current project store (placeholder)

class ProjectStore {
  constructor() {
    this.currentProject = null;
    this.projects = [];
  }

  setCurrentProject(project) {
    this.currentProject = project;
  }

  loadProjects() {
    // Would query local SQLite database
    return this.projects;
  }
}

export default new ProjectStore();