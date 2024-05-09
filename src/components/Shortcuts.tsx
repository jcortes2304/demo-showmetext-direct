import React from "react";


export default function Shortcuts() {

    return (
        <div>
            <div className="w-full border rounded-md border-gray-400 p-2">
                <div className="flex px-1">
                    <label className="label font-bold text-sm">Ctrl + Alt + S: </label>
                    <label className="label text-sm">Enviar texto hasta posición del cursor</label>
                </div>
                <div className="divider"></div>
                <div className="flex px-1">
                    <label className="label font-bold text-sm">Ctrl + Alt + L: </label>
                    <label className="label text-sm">Limpiar texto enviado</label>
                </div>
                <div className="divider"></div>
                <div className="flex px-1">
                    <label className="label font-bold text-sm">Ctrl + Alt + I: </label>
                    <label className="label text-sm">Iniciar envio automatico</label>
                </div>
                <div className="divider"></div>
                <div className="flex px-1">
                    <label className="label font-bold text-sm">Ctrl + Alt + D: </label>
                    <label className="label text-sm">Detener envio automatico</label>
                </div>
            </div>
        </div>
    )
}