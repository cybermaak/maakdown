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
	    readerTheme: string;
	    readerFont: string;
	    readerFontSize: number;
	    readerLineHeight: string;
	    readerMeasure: string;
	    focusMode: boolean;
	    outlineVisible: boolean;
	    outlineWidth: number;
	    metadataWidth: number;
	    documentLineNumbers: boolean;
	    codeLineNumbers: boolean;
	    codeWrap: boolean;
	    printMetadata: boolean;
	    tableConstrainToMeasure: boolean;
	    tableColumnSizing: string;
	
	    static createFrom(source: any = {}) {
	        return new AppConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.theme = source["theme"];
	        this.highlighterEngine = source["highlighterEngine"];
	        this.frontmatterDisplay = source["frontmatterDisplay"];
	        this.readerTheme = source["readerTheme"];
	        this.readerFont = source["readerFont"];
	        this.readerFontSize = source["readerFontSize"];
	        this.readerLineHeight = source["readerLineHeight"];
	        this.readerMeasure = source["readerMeasure"];
	        this.focusMode = source["focusMode"];
	        this.outlineVisible = source["outlineVisible"];
	        this.outlineWidth = source["outlineWidth"];
	        this.metadataWidth = source["metadataWidth"];
	        this.documentLineNumbers = source["documentLineNumbers"];
	        this.codeLineNumbers = source["codeLineNumbers"];
	        this.codeWrap = source["codeWrap"];
	        this.printMetadata = source["printMetadata"];
	        this.tableConstrainToMeasure = source["tableConstrainToMeasure"];
	        this.tableColumnSizing = source["tableColumnSizing"];
	    }
	}
	export class RecentDocument {
	    path: string;
	    displayName: string;
	    lastOpenedAt: string;
	    pinned?: boolean;
	    missingAt?: string;
	
	    static createFrom(source: any = {}) {
	        return new RecentDocument(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.displayName = source["displayName"];
	        this.lastOpenedAt = source["lastOpenedAt"];
	        this.pinned = source["pinned"];
	        this.missingAt = source["missingAt"];
	    }
	}
	export class ReaderPosition {
	    scrollTop: number;
	    activeHeadingId?: string;
	
	    static createFrom(source: any = {}) {
	        return new ReaderPosition(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.scrollTop = source["scrollTop"];
	        this.activeHeadingId = source["activeHeadingId"];
	    }
	}
	export class SessionTab {
	    path: string;
	    position: ReaderPosition;
	
	    static createFrom(source: any = {}) {
	        return new SessionTab(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.position = this.convertValues(source["position"], ReaderPosition);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class PersistedSession {
	    tabs: SessionTab[];
	    activePath?: string;
	    recents: RecentDocument[];
	
	    static createFrom(source: any = {}) {
	        return new PersistedSession(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.tabs = this.convertValues(source["tabs"], SessionTab);
	        this.activePath = source["activePath"];
	        this.recents = this.convertValues(source["recents"], RecentDocument);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
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
