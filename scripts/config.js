document.getElementById("salvar").addEventListener("click", () => {
    const perfil = {
        estilo: document.getElementById("estilo").value,
        vieses: [
            document.getElementById("pigmaleao").checked ? "Efeito Pigmaleão" : "",
            document.getElementById("prova-social").checked ? "Prova Social" : ""
        ].filter(Boolean)
    };

    localStorage.setItem("perfilSelecionado", JSON.stringify(perfil));
    alert("Configurações salvas!");
});
