import {useTranslations} from "next-intl";


const SpeakerSelector = () => {
    const t = useTranslations('HomePage.SpeakerSelector');

    return (
        <div>
            {/*<details className="dropdown">*/}
            {/*    <summary className="btn m-1">{t('select')}</summary>*/}
            {/*    <ul className="menu dropdown-content bg-base-100 rounded-box z-[1] w-52 p-2 shadow">*/}
            {/*        <li key={1}><a>Item 1</a></li>*/}
            {/*        <li key={2}><a>Item 2</a></li>*/}
            {/*    </ul>*/}
            {/*</details>*/}
        </div>
    )
}

export default SpeakerSelector;
