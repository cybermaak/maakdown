export namespace assetservice {
	
	export class AssetRef {
	    id: string;
	    url: string;
	    mime: string;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new AssetRef(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.url = source["url"];
	        this.mime = source["mime"];
	        this.error = source["error"];
	    }
	}

}

export namespace config {
	
	export class AppConfig {
	    theme: string;
	    highlighterEngine: string;
	    frontmatterDisplay: string;
	
	    static createFrom(source: any = {}) {
	        return new AppConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.theme = source["theme"];
	        this.highlighterEngine = source["highlighterEngine"];
	        this.frontmatterDisplay = source["frontmatterDisplay"];
	    }
	}

}

export namespace fileservice {
	
	export class DocumentBytes {
	    path: string;
	    contents: string;
	    modTime: string;
	
	    static createFrom(source: any = {}) {
	        return new DocumentBytes(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.contents = source["contents"];
	        this.modTime = source["modTime"];
	    }
	}
	export class OpenDocumentResult {
	    path: string;
	    contents: string;
	    documentDir: string;
	    trustedRoot: string;
	    modTime: string;
	    vaultId?: string;
	
	    static createFrom(source: any = {}) {
	        return new OpenDocumentResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.contents = source["contents"];
	        this.documentDir = source["documentDir"];
	        this.trustedRoot = source["trustedRoot"];
	        this.modTime = source["modTime"];
	        this.vaultId = source["vaultId"];
	    }
	}

}

export namespace vault {
	
	export class VaultIndex {
	    version: string;
	    notes: Record<string, string>;
	
	    static createFrom(source: any = {}) {
	        return new VaultIndex(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.version = source["version"];
	        this.notes = source["notes"];
	    }
	}

}

