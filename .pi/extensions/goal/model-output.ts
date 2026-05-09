export type XmlExtraction = { ok: true; xml: string; warnings: string[] } | { ok: false; error: string; warnings: string[] };

export function extractXmlPayload(output: string, rootTag: string): XmlExtraction {
	const warnings: string[] = [];
	const trimmed = output.trim();
	if (!trimmed) return { ok: false, error: "Monitor returned empty output.", warnings };

	const fenced = firstMatchingFence(trimmed, rootTag);
	if (fenced) {
		warnings.push("Extracted XML from Markdown code fence.");
		return { ok: true, xml: fenced, warnings };
	}

	const direct = sliceRootElement(trimmed, rootTag);
	if (direct) {
		if (direct !== trimmed) warnings.push("Extracted XML from surrounding prose.");
		return { ok: true, xml: direct, warnings };
	}

	return { ok: false, error: `Could not find <${rootTag}> XML payload.`, warnings };
}

export function readXmlTag(xml: string, tag: string): string | undefined {
	return readXmlTags(xml, tag)[0];
}

export function readXmlTags(xml: string, tag: string): string[] {
	const values: string[] = [];
	const pattern = new RegExp(`<${escapeRegExp(tag)}(?:\\s[^>]*)?>([\\s\\S]*?)(?:<\\/${escapeRegExp(tag)}>|$)`, "gi");
	let match: RegExpExecArray | null;
	while ((match = pattern.exec(xml)) !== null) {
		values.push(decodeXmlEntities(match[1].trim()));
	}
	return values;
}

export function requireXmlTag(xml: string, tag: string): { ok: true; value: string } | { ok: false; error: string } {
	const value = readXmlTag(xml, tag);
	if (value === undefined || value.trim() === "") return { ok: false, error: `Missing required <${tag}> tag.` };
	return { ok: true, value };
}

function firstMatchingFence(text: string, rootTag: string): string | undefined {
	const fencePattern = /```(?:xml|[A-Za-z0-9_-]+)?\s*\n([\s\S]*?)```/g;
	let match: RegExpExecArray | null;
	while ((match = fencePattern.exec(text)) !== null) {
		const payload = sliceRootElement(match[1].trim(), rootTag);
		if (payload) return payload;
	}
	return undefined;
}

function sliceRootElement(text: string, rootTag: string): string | undefined {
	const openPattern = new RegExp(`<${escapeRegExp(rootTag)}(?:\\s[^>]*)?>`, "i");
	const open = openPattern.exec(text);
	if (!open || open.index === undefined) return undefined;
	const start = open.index;
	const closePattern = new RegExp(`<\\/${escapeRegExp(rootTag)}>`, "i");
	const rest = text.slice(start + open[0].length);
	const close = closePattern.exec(rest);
	if (!close || close.index === undefined) return text.slice(start).trim();
	return text.slice(start, start + open[0].length + close.index + close[0].length).trim();
}

function decodeXmlEntities(value: string): string {
	return value
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&amp;/g, "&");
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
