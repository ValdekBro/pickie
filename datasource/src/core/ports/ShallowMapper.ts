import type { DocHeader } from "../entities/Header";
import type { SourceItem } from "./SourceAdapter";

export interface ShallowMapper<R, Body> {
    toHeader(item: SourceItem<R>, source: string): DocHeader;
    toBody(item: SourceItem<R>, source: string): Body;
}

