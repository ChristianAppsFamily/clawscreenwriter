define(function(require) {

    var Protoplast = require('protoplast'),
        $ = require('jquery'),
        tree = require('utils/tree');

    var ClawApiController = Protoplast.Object.extend({

        scriptModel: {
            inject: 'script'
        },

        ioModel: {
            inject: 'plugin/io/model/io-model'
        },

        settings: {
            inject: 'settings'
        },

        apiBaseUrl: function() {
            // Use current host for API, or override with setting
            return this.settings.claw_api_url || '';
        },

        /**
         * Get all projects from API
         */
        getProjects: function(callback) {
            $.ajax({
                url: this.apiBaseUrl() + '/api/projects',
                method: 'GET',
                success: function(response) {
                    callback(null, response.projects || []);
                },
                error: function(xhr, status, error) {
                    callback(error || 'Failed to load projects');
                }
            });
        },

        /**
         * Get documents for a project
         */
        getDocuments: function(projectId, callback) {
            $.ajax({
                url: this.apiBaseUrl() + '/api/projects/' + projectId + '/documents',
                method: 'GET',
                success: function(response) {
                    callback(null, response.documents || []);
                },
                error: function(xhr, status, error) {
                    callback(error || 'Failed to load documents');
                }
            });
        },

        /**
         * Get a single document
         */
        getDocument: function(documentId, callback) {
            $.ajax({
                url: this.apiBaseUrl() + '/api/documents/' + documentId,
                method: 'GET',
                success: function(response) {
                    callback(null, response);
                },
                error: function(xhr, status, error) {
                    callback(error || 'Failed to load document');
                }
            });
        },

        /**
         * Save document to API
         */
        saveDocument: function(projectId, title, content, documentId, callback) {
            var data = {
                title: title,
                content: content,
                project_id: projectId
            };

            var url = this.apiBaseUrl() + '/api/documents';
            var method = 'POST';

            if (documentId) {
                url += '/' + documentId;
                method = 'PUT';
            }

            $.ajax({
                url: url,
                method: method,
                contentType: 'application/json',
                data: JSON.stringify(data),
                success: function(response) {
                    callback(null, response);
                },
                error: function(xhr, status, error) {
                    callback(error || 'Failed to save document');
                }
            });
        },

        /**
         * Create a new project
         */
        createProject: function(name, description, callback) {
            $.ajax({
                url: this.apiBaseUrl() + '/api/projects',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    name: name,
                    description: description || ''
                }),
                success: function(response) {
                    callback(null, response);
                },
                error: function(xhr, status, error) {
                    callback(error || 'Failed to create project');
                }
            });
        },

        /**
         * Show project/document browser and load selected
         */
        openFromClaw: function(callback) {
            var self = this;
            $.prompt('Loading projects...');

            this.getProjects(function(err, projects) {
                $.prompt.close();

                if (err) {
                    $.prompt('Error loading projects: ' + err);
                    return;
                }

                if (projects.length === 0) {
                    $.prompt('No projects found. Create one first?');
                    return;
                }

                // Convert projects to tree format
                var treeData = projects.map(function(p) {
                    return {
                        text: p.name,
                        data: { id: p.id, type: 'project', description: p.description }
                    };
                });

                tree.show({
                    info: 'Select a project to view documents:',
                    data: [{ text: 'Projects', children: treeData }],
                    label: 'Open',
                    callback: function(selected) {
                        if (selected.data.type === 'project') {
                            self._showDocumentsForProject(selected.data.id, selected.text, callback);
                        }
                    }
                });
            });
        },

        /**
         * Show documents in a project
         */
        _showDocumentsForProject: function(projectId, projectName, callback) {
            var self = this;
            $.prompt('Loading documents...');

            this.getDocuments(projectId, function(err, documents) {
                $.prompt.close();

                if (err) {
                    $.prompt('Error loading documents: ' + err);
                    return;
                }

                if (documents.length === 0) {
                    $.prompt('No documents in this project.');
                    return;
                }

                var docTreeData = documents.map(function(d) {
                    return {
                        text: d.title || 'Untitled',
                        data: { id: d.id, type: 'document', project_id: projectId }
                    };
                });

                tree.show({
                    info: 'Select a document to open:',
                    data: [{ text: projectName, children: docTreeData }],
                    label: 'Open',
                    callback: function(selected) {
                        if (selected.data.type === 'document') {
                            self._loadDocument(selected.data.id, callback);
                        }
                    }
                });
            });
        },

        /**
         * Load document content
         */
        _loadDocument: function(documentId, callback) {
            var self = this;
            $.prompt('Loading document...');

            this.getDocument(documentId, function(err, doc) {
                $.prompt.close();

                if (err) {
                    $.prompt('Error loading document: ' + err);
                    return;
                }

                self.ioModel.clawDocumentId = documentId;
                self.ioModel.clawProjectId = doc.project_id;
                self.ioModel.fountainFileName = doc.title || 'untitled.fountain';

                if (callback) {
                    callback(null, doc.content);
                }
            });
        },

        /**
         * Save current script to Claw API
         */
        saveToClaw: function(callback) {
            var self = this;
            var content = this.scriptModel.script;
            var title = this.ioModel.fountainFileName || 'untitled.fountain';

            // Extract title from fountain if possible
            var titleMatch = content.match(/title:\s*(.+)/i);
            if (titleMatch) {
                title = titleMatch[1].trim() + '.fountain';
            }

            // If we have a current document, update it
            if (this.ioModel.clawDocumentId && this.ioModel.clawProjectId) {
                this.saveDocument(
                    this.ioModel.clawProjectId,
                    title.replace('.fountain', ''),
                    content,
                    this.ioModel.clawDocumentId,
                    function(err, result) {
                        if (err) {
                            $.prompt('Error saving: ' + err);
                        } else {
                            $.prompt('Saved to Claw!');
                            if (callback) callback(null, result);
                        }
                    }
                );
            } else {
                // Need to select/create project first
                this._selectProjectForSave(content, title, callback);
            }
        },

        /**
         * Select project for saving new document
         */
        _selectProjectForSave: function(content, title, callback) {
            var self = this;

            this.getProjects(function(err, projects) {
                if (err) {
                    $.prompt('Error loading projects: ' + err);
                    return;
                }

                var options = {
                    buttons: {}
                };

                // Add existing projects as buttons
                projects.forEach(function(p) {
                    options.buttons[p.name] = p.id;
                });

                options.buttons['+ New Project'] = 'new';
                options.buttons['Cancel'] = false;

                $.prompt('Save to which project?', options);

                // Override the submit handler
                var originalSubmit = $.prompt.options.submit;
                $.prompt.options.submit = function(v, m, f) {
                    if (v === false) return true; // Cancel

                    if (v === 'new') {
                        // Create new project
                        $.prompt('Enter project name:', function(result) {
                            if (result.text) {
                                self.createProject(result.text, '', function(err, project) {
                                    if (err) {
                                        $.prompt('Error creating project: ' + err);
                                    } else {
                                        self._saveToProject(project.id, content, title, callback);
                                    }
                                });
                            }
                        });
                    } else {
                        // Save to existing project
                        self._saveToProject(v, content, title, callback);
                    }
                    return true;
                };
            });
        },

        /**
         * Save document to specific project
         */
        _saveToProject: function(projectId, content, title, callback) {
            var self = this;

            this.saveDocument(
                projectId,
                title.replace('.fountain', ''),
                content,
                null,
                function(err, result) {
                    if (err) {
                        $.prompt('Error saving: ' + err);
                    } else {
                        self.ioModel.clawDocumentId = result.id;
                        self.ioModel.clawProjectId = projectId;
                        $.prompt('Saved to Claw!');
                        if (callback) callback(null, result);
                    }
                }
            );
        }

    });

    return ClawApiController;
});
