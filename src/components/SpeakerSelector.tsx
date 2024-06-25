import { useTranslations } from "next-intl";
import useAppStore from "@/store/store";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useState, useRef, useEffect } from "react";

const SpeakerSelector = () => {
    const t = useTranslations('HomePage.SpeakerSelector');
    const [showModal, setShowModal] = useState<boolean>(false);
    const { speakers } = useAppStore();
    const modalRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        if (showModal && modalRef.current) {
            modalRef.current.showModal();
        } else if (!showModal && modalRef.current) {
            modalRef.current.close();
        }
    }, [showModal]);

    const Modal = () => {
        return (
            <dialog id="speaker_modal" className="modal" ref={modalRef}>
                <div className="modal-box">
                    <form method="dialog">
                        <button
                            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                            onClick={() => setShowModal(false)}
                        >
                            ✕
                        </button>
                    </form>
                    <h3 className="font-bold text-lg">{t('addSpeakerTitle')}</h3>
                    <p className="py-4">{t('addSpeakerDescription')}</p>
                    {/* campos para crear hablante */}
                    <div className="modal-action">
                        <form method="dialog" className="flex gap-5">
                            <button className="btn">Aceptar</button>
                            <button className="btn">Cancelar</button>
                        </form>
                    </div>
                </div>
            </dialog>
        );
    };

    const toggleModal = () => {
        setShowModal(!showModal);
    };

    const getSpeakerColor = (color: string) => {
        switch (color) {
            case "#0275d8":
                return "badge-primary";
            case "#5cb85c":
                return "badge-success";
            case "#5bc0de":
                return "badge-info";
            case "#f0ad4e":
                return "badge-warning";
            case "#ed515c":
                return "badge-error";
            case "#6c757d":
                return "badge-secondary";
            default:
                return "badge-dark";
        }
    }

    return (
        <div>
            {speakers.map((speaker) => (
                <div key={speaker.id} className={`badge ${getSpeakerColor(speaker.color)} gap-2 mx-1`}>
                    <XMarkIcon className="h-5 w-5 cursor-pointer" />
                    {speaker.name}
                </div>
            ))}
            {/*<div className="mt-3">*/}
            {/*    <button className="btn btn-sm btn-primary" onClick={toggleModal}>*/}
            {/*        {t('addSpeaker')}*/}
            {/*    </button>*/}
            {/*</div>*/}
            {/*<Modal />*/}
        </div>
    );
};

export default SpeakerSelector;
