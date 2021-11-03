import KeyPerformanceIndicators from "./KeyPerformanceIndicators/KeyPerformanceIndicators"
import Glossary from "./Glossary/Glossary"
import Subtitle from "./Subtitle/Subtitle"
import PublicationContext from "./PublicationContext/PublicationContext"
const { registerPlugin } = wp.plugins
const { PluginDocumentSettingPanel } = wp.editPost
const { select } = wp.data
import { Notice } from "@wordpress/components"

const OWID_KEY_PERFORMANCE_INDICATORS = "owid-key-performance-indicators"
const OWID_GLOSSARY = "owid-glossary"
const OWID_SUBTITLE = "owid-subtitle"
const OWID_PUBLICATION_CONTEXT = "owid-publication-context"

registerPlugin(OWID_KEY_PERFORMANCE_INDICATORS, {
    render: () => {
        const postType = select("core/editor").getCurrentPostType()
        return (
            postType === "page" && (
                <PluginDocumentSettingPanel
                    name={OWID_KEY_PERFORMANCE_INDICATORS}
                    title="Key Performance Indicators (KPI)"
                    className={OWID_KEY_PERFORMANCE_INDICATORS}
                >
                    <KeyPerformanceIndicators />
                </PluginDocumentSettingPanel>
            )
        )
    },
    icon: false,
})

registerPlugin(OWID_GLOSSARY, {
    render: () => {
        const postType = select("core/editor").getCurrentPostType()
        return (
            (postType === "page" || postType === "post") && (
                <PluginDocumentSettingPanel
                    name={OWID_GLOSSARY}
                    title="Glossary"
                    className={OWID_GLOSSARY}
                >
                    <Glossary />
                </PluginDocumentSettingPanel>
            )
        )
    },
    icon: false,
})

registerPlugin(OWID_SUBTITLE, {
    render: () => {
        const postType = select("core/editor").getCurrentPostType()
        return (
            postType === "post" && (
                <PluginDocumentSettingPanel
                    name={OWID_SUBTITLE}
                    title="Subtitle"
                    className={OWID_SUBTITLE}
                >
                    <Subtitle />
                </PluginDocumentSettingPanel>
            )
        )
    },
    icon: false,
})

registerPlugin(OWID_PUBLICATION_CONTEXT, {
    render: () => {
        const postType = select("core/editor").getCurrentPostType()
        return (
            postType === "post" && (
                <PluginDocumentSettingPanel
                    name={OWID_PUBLICATION_CONTEXT}
                    title="Publication context"
                    className={OWID_PUBLICATION_CONTEXT}
                >
                    <Notice isDismissible={false}>
                        Currently, publication in the article index cannot be
                        dissociated from publication in the immediate
                        newsletter.
                    </Notice>
                    <PublicationContext />
                </PluginDocumentSettingPanel>
            )
        )
    },
    icon: false,
})
