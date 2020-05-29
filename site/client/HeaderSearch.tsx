import React, { useEffect, useState } from "react"
import { SearchResults } from "./SearchResults"
import { SiteSearchResults, siteSearch } from "site/siteSearch"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faSearch } from "@fortawesome/free-solid-svg-icons/faSearch"

const HeaderSearchResults = (props: { results: SiteSearchResults }) => {
    useEffect(() => {
        document.body.style.overflowY = "hidden"

        return () => {
            document.body.style.overflowY = ""
        }
    }, [])

    return <SearchResults results={props.results} />
}

export const HeaderSearch = (props: { autoFocus?: boolean }) => {
    const [search, setSearch] = useState("")
    const [results, setResults] = useState<SiteSearchResults | undefined>(
        undefined
    )

    useEffect(() => {
        if (search === "") setResults(undefined)
        else siteSearch(search).then(setResults)
    }, [search, setResults])

    return (
        <form action="/search" method="GET" className="HeaderSearch">
            <input
                type="search"
                name="q"
                onChange={e => setSearch(e.currentTarget.value)}
                placeholder="Search..."
                autoFocus={props.autoFocus}
            />
            <div className="icon">
                <FontAwesomeIcon icon={faSearch} />
            </div>
            {results && <HeaderSearchResults results={results} />}
        </form>
    )
}
