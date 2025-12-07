/**
 * GitHub Gist Storage Module
 * Provides functions to save, load, and manage GridLang code using GitHub Gists
 */

class GistStorage {
    constructor() {
        this.token = localStorage.getItem('gridlang_github_token') || '';
        this.baseUrl = 'https://api.github.com';
    }

    /**
     * Set GitHub personal access token
     */
    setToken(token) {
        this.token = token;
        localStorage.setItem('gridlang_github_token', token);
    }

    /**
     * Get current token
     */
    getToken() {
        return this.token;
    }

    /**
     * Check if token is configured
     */
    hasToken() {
        return this.token && this.token.length > 0;
    }

    /**
     * Make authenticated API request to GitHub
     */
    async request(endpoint, options = {}) {
        if (!this.hasToken()) {
            throw new Error('GitHub token not configured. Please set your token first.');
        }

        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            ...options.headers
        };

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(`GitHub API error: ${error.message || response.statusText}`);
        }

        return response.json();
    }

    /**
     * Create a new gist with GridLang code
     * @param {string} filename - Name of the file
     * @param {string} code - GridLang code content
     * @param {string} description - Description of the gist
     * @param {boolean} isPublic - Whether gist should be public
     * @returns {Promise<Object>} Created gist object
     */
    async createGist(filename, code, description = 'GridLang script', isPublic = false) {
        const files = {};
        files[filename] = {
            content: code
        };

        const data = await this.request('/gists', {
            method: 'POST',
            body: JSON.stringify({
                description,
                public: isPublic,
                files
            })
        });

        return {
            id: data.id,
            url: data.html_url,
            description: data.description,
            filename,
            content: code,
            created_at: data.created_at,
            updated_at: data.updated_at
        };
    }

    /**
     * Update an existing gist
     * @param {string} gistId - ID of the gist to update
     * @param {string} filename - Name of the file
     * @param {string} code - Updated code content
     * @param {string} description - Updated description
     */
    async updateGist(gistId, filename, code, description = null) {
        const files = {};
        files[filename] = {
            content: code
        };

        const body = { files };
        if (description) {
            body.description = description;
        }

        const data = await this.request(`/gists/${gistId}`, {
            method: 'PATCH',
            body: JSON.stringify(body)
        });

        return {
            id: data.id,
            url: data.html_url,
            description: data.description,
            filename,
            content: code,
            updated_at: data.updated_at
        };
    }

    /**
     * Get a specific gist by ID
     * @param {string} gistId - ID of the gist
     */
    async getGist(gistId) {
        const data = await this.request(`/gists/${gistId}`);
        
        // Extract the first .grid file or any file
        const files = Object.keys(data.files);
        const gridFile = files.find(f => f.endsWith('.grid')) || files[0];
        
        if (!gridFile) {
            throw new Error('No files found in gist');
        }

        return {
            id: data.id,
            url: data.html_url,
            description: data.description,
            filename: gridFile,
            content: data.files[gridFile].content,
            created_at: data.created_at,
            updated_at: data.updated_at
        };
    }

    /**
     * List all gists for the authenticated user
     * @param {number} perPage - Number of gists per page (max 100)
     * @param {number} page - Page number
     */
    async listGists(perPage = 30, page = 1) {
        const data = await this.request(`/gists?per_page=${perPage}&page=${page}`);
        
        // Filter to show GridLang gists (those with .grid files) and all gists
        return data.map(gist => {
            const files = Object.keys(gist.files);
            const gridFile = files.find(f => f.endsWith('.grid')) || files[0];
            
            return {
                id: gist.id,
                url: gist.html_url,
                description: gist.description || 'Untitled',
                filename: gridFile || 'No files',
                fileCount: files.length,
                created_at: gist.created_at,
                updated_at: gist.updated_at,
                public: gist.public,
                hasGridFile: files.some(f => f.endsWith('.grid'))
            };
        }).filter(gist => gist.fileCount > 0);
    }

    /**
     * Delete a gist
     * @param {string} gistId - ID of the gist to delete
     */
    async deleteGist(gistId) {
        await this.request(`/gists/${gistId}`, {
            method: 'DELETE'
        });
        return true;
    }

    /**
     * Save current file to a new or existing gist
     * This method manages the mapping between local files and gist IDs
     * @param {string} localFilename - Local file name
     * @param {string} code - Code to save
     * @param {string} gistId - Optional gist ID to update (null for new gist)
     */
    async saveFile(localFilename, code, gistId = null) {
        const gridFilename = localFilename.endsWith('.grid') ? localFilename : `${localFilename}.grid`;
        
        if (gistId) {
            // Update existing gist
            return await this.updateGist(gistId, gridFilename, code);
        } else {
            // Create new gist
            const description = `GridLang: ${localFilename}`;
            return await this.createGist(gridFilename, code, description, false);
        }
    }

    /**
     * Load a file from a gist
     * @param {string} gistId - ID of the gist to load
     */
    async loadFile(gistId) {
        return await this.getGist(gistId);
    }

    /**
     * Get the gist ID mapping for local files
     * This maps local file names to their corresponding gist IDs
     */
    getFileGistMapping() {
        const mapping = localStorage.getItem('gridlang_gist_mapping');
        return mapping ? JSON.parse(mapping) : {};
    }

    /**
     * Save the gist ID mapping
     */
    saveFileGistMapping(mapping) {
        localStorage.setItem('gridlang_gist_mapping', JSON.stringify(mapping));
    }

    /**
     * Map a local file to a gist ID
     */
    mapFileToGist(localFilename, gistId) {
        const mapping = this.getFileGistMapping();
        mapping[localFilename] = gistId;
        this.saveFileGistMapping(mapping);
    }

    /**
     * Get gist ID for a local file
     */
    getGistIdForFile(localFilename) {
        const mapping = this.getFileGistMapping();
        return mapping[localFilename] || null;
    }

    /**
     * Remove mapping for a local file
     */
    unmapFile(localFilename) {
        const mapping = this.getFileGistMapping();
        delete mapping[localFilename];
        this.saveFileGistMapping(mapping);
    }
}

// Create global instance
window.gistStorage = new GistStorage();
