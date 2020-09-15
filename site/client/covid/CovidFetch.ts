import { csvParse } from "d3-dsv"

import {
    fetchText,
    retryPromise,
    memoize,
    parseIntOrUndefined,
} from "grapher/utils/Util"

import { CovidSeries } from "./CovidTypes"
import { ECDC_DATA_URL, TESTS_DATA_URL } from "./CovidConstants"
import { DateTime } from "luxon"

async function _fetchECDCData(): Promise<CovidSeries> {
    const responseText = await retryPromise(() => fetchText(ECDC_DATA_URL))
    const rows: CovidSeries = csvParse(responseText).map((row) => {
        return {
            date: new Date(row.date as string),
            location: row.location as string,
            totalCases: parseIntOrUndefined(row.total_cases),
            totalDeaths: parseIntOrUndefined(row.total_deaths),
            newCases: parseIntOrUndefined(row.new_cases),
            newDeaths: parseIntOrUndefined(row.new_deaths),
        }
    })
    return rows
}

// We want to memoize (cache) the return value of that fetch, so we don't need to load
// the file multiple times if we request the data more than once
export const fetchECDCData = memoize(_fetchECDCData)

//      'Entity string'
//      'OWID country'
//      'Total tests/ individuals tested'
//      'Positive tests/ confirmed cases (refer to 'Remarks')'
//      'Date to which estimate refers (dd mmm yyyy)'
//      'Source URL'
//      'Source label'
//      'Date of source publication (dd mmm yyyy)'
//      'Time of source publication (hh:mm)'
// 'Timezone (keep same if multiple observations per day)'
//      'Remarks'
// 'Tests per million people'
//      'Population'
//      'Non-official / Non-verifiable (=1)'

export interface CovidTestsDatum {
    totalTests: number | undefined
    totalPositiveTests: number | undefined
    sourceURL: string | undefined
    sourceLabel: string | undefined
    publicationDate: Date
    remarks: string | undefined
    population: number | undefined
    nonOfficial: boolean
}

export async function fetchTestsData(): Promise<CovidSeries> {
    const responseText = await retryPromise(() => fetchText(TESTS_DATA_URL))
    const rows: CovidSeries = csvParse(responseText).map((row) => {
        return {
            date: DateTime.fromFormat(
                row["Date to which estimate refers (dd mmm yyyy)"] as string,
                "dd MMMM yyyy"
            ).toJSDate(),
            location: row["Entity string"] as string,
            tests: {
                totalTests: parseIntOrUndefined(
                    row["Total tests/ individuals tested"]
                ),
                totalPositiveTests: parseIntOrUndefined(
                    row["Positive tests/ confirmed cases (refer to 'Remarks')"]
                ),
                sourceURL: row["Source URL"],
                sourceLabel: row["Source label"],
                publicationDate: DateTime.fromFormat(
                    `${row["Date of source publication (dd mmm yyyy)"]} ${row["Time of source publication (hh:mm)"]}`,
                    "dd MMMM yyyy HH:mm"
                ).toJSDate(),
                remarks: row["Remarks"],
                population: parseIntOrUndefined(row["Population"]),
                nonOfficial:
                    parseIntOrUndefined(
                        row["Non-official / Non-verifiable (=1)"]
                    ) === 1,
            },
        }
    })
    return rows
}
