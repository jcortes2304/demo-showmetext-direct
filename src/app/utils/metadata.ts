import {getTranslations} from "next-intl/server";

export default async function generateMetadata({params: {locale, namespace}}: {params:{locale: string, namespace: string}}) {
    const t = await getTranslations({ locale, namespace: namespace });

    return {
        title: t('title'),
        description: t('description')
    };
}
