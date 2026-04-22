# Claw Screenwriter

A self-hosted screenwriting platform with REST API, built on top of Afterwriting.

## Features

- **Fountain Editor**: Full-featured screenwriting editor with Fountain syntax
- **Project Management**: Organize screenplays into projects
- **Version History**: Track document changes with automatic versioning
- **PDF Export**: Generate industry-standard PDF screenplays
- **FDX Export**: Export to Final Draft format
- **REST API**: Full API for programmatic access
- **SQLite Persistence**: Local database storage

## Quick Start

### Docker

```bash
docker-compose up -d
```

The application will be available at `http://localhost:3000`.

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## API Endpoints

### Health
- `GET /api/health` - Health check

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create a new project
- `GET /api/projects/:id` - Get a project
- `PUT /api/projects/:id` - Update a project
- `DELETE /api/projects/:id` - Delete a project
- `GET /api/projects/:id/documents` - List project documents

### Documents
- `GET /api/documents` - List all documents
- `POST /api/documents` - Create a new document
- `GET /api/documents/:id` - Get a document
- `PUT /api/documents/:id` - Update a document
- `DELETE /api/documents/:id` - Delete a document
- `GET /api/documents/:id/versions` - List document versions
- `GET /api/documents/:id/versions/:versionId` - Get a specific version

### Parse
- `POST /api/parse/fountain` - Parse Fountain text
- `POST /api/parse/stats` - Get script statistics

### Export
- `GET /api/export/pdf/:documentId` - Export document to PDF
- `POST /api/export/pdf` - Export Fountain text to PDF
- `GET /api/export/fdx/:documentId` - Export document to FDX
- `POST /api/export/fdx` - Export Fountain text to FDX

## Environment Variables

- `PORT` - Server port (default: 3000)
- `DB_DIR` - Database directory (default: ./data)
- `NODE_ENV` - Environment (development/production)

## License

MIT
