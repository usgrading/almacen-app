"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  appCardInner,
  appFondoMain,
  appNavLink,
  appSubtituloPagina,
  appTituloPagina,
} from "@/lib/app-ui";

const SECCIONES: readonly string[] = [
  "Inicio de sesión",
  "Primer acceso",
  "Panel principal",
  "Entradas MX",
  "Entradas USA",
  "Salidas",
  "Inventario",
  "Reportes",
  "Alertas",
  "Usuarios",
];

export default function InstruccionesPage() {
  const router = useRouter();
  const [esCel, setEsCel] = useState(false);

  useEffect(() => {
    const revisarPantalla = () => {
      setEsCel(window.innerWidth < 768);
    };

    revisarPantalla();
    window.addEventListener("resize", revisarPantalla);

    return () => window.removeEventListener("resize", revisarPantalla);
  }, []);

  return (
    <main style={appFondoMain}>
      <div style={{ maxWidth: esCel ? 520 : 1100, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <button
            type="button"
            className="app-nav-link"
            onClick={() => router.push("/dashboard")}
            style={appNavLink}
          >
            ← Inicio
          </button>
        </div>

        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <img
            src="/logo.png"
            alt="Logo"
            style={{
              width: 100,
              height: "auto",
              objectFit: "contain",
            }}
          />
        </div>

        <h2
          style={{
            ...appTituloPagina,
            marginBottom: 8,
          }}
        >
          Instrucciones
        </h2>

        <p
          style={{
            ...appSubtituloPagina,
            margin: "0 0 22px 0",
          }}
        >
          Guía de uso del sistema
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {SECCIONES.map((titulo) => (
            <section
              key={titulo}
              aria-labelledby={`instrucciones-seccion-${slugId(titulo)}`}
              style={{
                ...appCardInner,
                padding: "18px",
              }}
            >
              <h3
                id={`instrucciones-seccion-${slugId(titulo)}`}
                style={styles.sectionTitle}
              >
                {titulo}
              </h3>
              {titulo === "Inicio de sesión" ? (
                <ContenidoInicioSesion />
              ) : titulo === "Primer acceso" ? (
                <ContenidoPrimerAcceso />
              ) : titulo === "Panel principal" ? (
                <ContenidoPanelPrincipal />
              ) : titulo === "Entradas MX" ? (
                <ContenidoEntradasMx />
              ) : titulo === "Entradas USA" ? (
                <ContenidoEntradasUsa />
              ) : titulo === "Salidas" ? (
                <ContenidoSalidas />
              ) : titulo === "Inventario" ? (
                <ContenidoInventario />
              ) : titulo === "Reportes" ? (
                <ContenidoReportes />
              ) : titulo === "Alertas" ? (
                <ContenidoAlertas />
              ) : titulo === "Usuarios" ? (
                <ContenidoUsuarios />
              ) : (
                <p style={styles.placeholder}>Contenido pendiente...</p>
              )}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

function slugId(titulo: string): string {
  return titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const styles: Record<string, CSSProperties> = {
  sectionTitle: {
    margin: "0 0 12px 0",
    fontSize: "18px",
    fontWeight: 700,
    color: "#0f172a",
    letterSpacing: "-0.02em",
  },
  placeholder: {
    margin: 0,
    fontSize: 15,
    lineHeight: 1.5,
    color: "#64748b",
  },
};

function ContenidoInicioSesion() {
  const base = styles.placeholder;
  const parrafo: CSSProperties = {
    ...base,
    margin: "0 0 12px 0",
  };

  return (
    <div>
      <p
        style={{
          ...base,
          margin: "0 0 14px 0",
          fontWeight: 600,
          color: "#0f172a",
        }}
      >
        Cómo ingresar al sistema
      </p>

      <p style={parrafo}>
        Para entrar al sistema, capture el acceso que le corresponda y su contraseña en los campos
        indicados.
      </p>

      <p style={parrafo}>
        La cuenta principal del negocio normalmente accede con <strong>correo electrónico</strong>{" "}
        y contraseña.
      </p>

      <p style={parrafo}>
        Los usuarios internos creados por el administrador suelen acceder con{" "}
        <strong>usuario (login)</strong> y contraseña.
      </p>

      <p style={parrafo}>
        El sistema puede manejar ambos tipos de acceso; por eso es importante usar siempre el dato
        correcto según el tipo de cuenta que le hayan asignado.
      </p>

      <p style={parrafo}>
        Si un usuario interno intenta entrar con un correo que no le corresponde, puede que no
        acceda aunque su usuario sí exista en el sistema.
      </p>

      <p style={parrafo}>
        Si el acceso y la contraseña son correctos, el sistema le permitirá entrar al panel
        principal.
      </p>

      <p style={{ ...parrafo, marginBottom: "8px" }}>
        Si el sistema rechaza el acceso, revise lo siguiente:
      </p>

      <ul
        style={{
          ...base,
          margin: "0 0 12px 0",
          paddingLeft: "1.25rem",
          listStyleType: "disc",
        }}
      >
        <li style={{ marginBottom: "6px" }}>
          Que no haya espacios de más al inicio o al final del correo o del usuario.
        </li>
        <li style={{ marginBottom: "6px" }}>
          Que esté usando el correo o el usuario correcto (según corresponda a su cuenta).
        </li>
        <li style={{ marginBottom: "6px" }}>Que la contraseña esté bien escrita.</li>
        <li style={{ marginBottom: "6px" }}>
          Que no confunda mayúsculas y minúsculas, caracteres especiales o una contraseña temporal
          que ya haya cambiado por una nueva.
        </li>
      </ul>

      <p style={{ ...base, margin: 0 }}>
        Le recomendamos escribir con calma y revisar los datos antes de intentar repetidas veces.
      </p>
    </div>
  );
}

function ContenidoPrimerAcceso() {
  const base = styles.placeholder;
  const parrafo: CSSProperties = {
    ...base,
    margin: "0 0 12px 0",
  };

  return (
    <div>
      <p
        style={{
          ...base,
          margin: "0 0 14px 0",
          fontWeight: 600,
          color: "#0f172a",
        }}
      >
        Contraseña temporal y primer ingreso (usuarios internos)
      </p>

      <p style={parrafo}>
        Los usuarios dados de alta por el administrador reciben una{" "}
        <strong>contraseña temporal</strong> generada automáticamente por el sistema.
      </p>

      <p style={parrafo}>Esa contraseña sirve únicamente para el primer acceso.</p>

      <p style={parrafo}>
        La primera vez que entra, el sistema le pedirá <strong>cambiar la contraseña de forma
        obligatoria</strong> antes de permitirle seguir; hasta entonces no podrá usar el resto de la
        aplicación con normalidad.
      </p>

      <p style={parrafo}>
        Así se protege la seguridad de la cuenta y se evita que una contraseña temporal siga
        utilizándose una vez conocida por varias personas.
      </p>

      <p style={parrafo}>
        Deberá escribir una nueva contraseña y confirmarla en la pantalla que el sistema muestra.
      </p>

      <p style={parrafo}>
        Cuando termine ese cambio, ya podrá trabajar en el sistema con normalidad.
      </p>

      <p style={parrafo}>
        A partir de ese momento, la contraseña temporal <strong>deja de ser válida</strong>; solo
        valdrá la nueva contraseña que definió.
      </p>

      <p style={{ ...parrafo, marginBottom: "8px" }}>
        Cree una contraseña segura y no la comparta con nadie.
      </p>

      <p style={{ ...parrafo, marginBottom: "8px" }}>
        Buenas prácticas:
      </p>

      <ul
        style={{
          ...base,
          margin: "0 0 12px 0",
          paddingLeft: "1.25rem",
          listStyleType: "disc",
        }}
      >
        <li style={{ marginBottom: "6px" }}>
          Use una contraseña difícil de adivinar.
        </li>
        <li style={{ marginBottom: "6px" }}>No la comparta con compañeros ni personas ajenas.</li>
        <li style={{ marginBottom: "6px" }}>
          No la anote en papel visible, notas sin proteger ni lugares inseguros.
        </li>
        <li style={{ marginBottom: "6px" }}>
          No reutilice contraseñas débiles o la misma que usa en otros sitios personales.
        </li>
      </ul>
    </div>
  );
}

function ContenidoPanelPrincipal() {
  const base = styles.placeholder;
  const parrafo: CSSProperties = {
    ...base,
    margin: "0 0 12px 0",
  };

  return (
    <div>
      <p
        style={{
          ...base,
          margin: "0 0 14px 0",
          fontWeight: 600,
          color: "#0f172a",
        }}
      >
        Qué es el panel y cómo moverse en el sistema
      </p>

      <p style={parrafo}>
        Cuando su acceso y contraseña son correctos, lo primero que verá es el{" "}
        <strong>panel principal</strong>: la pantalla de inicio desde la que arranca todo el trabajo
        en la aplicación.
      </p>

      <p style={parrafo}>
        Desde ahí puede abrir cada <strong>módulo</strong> al que su cuenta tenga permiso. No todos
        los usuarios ven los mismos botones: lo que aparece depende de su <strong>rol</strong>{" "}
        (por ejemplo, administrador, gestor o solo consulta).
      </p>

      <p style={parrafo}>
        Según esa configuración, puede tener acceso a opciones como{" "}
        <strong>Entradas MX</strong>, <strong>Entradas USA</strong>, <strong>Salidas</strong>,{" "}
        <strong>Inventario</strong>, <strong>Reportes</strong> y, dentro de esa zona, listados como{" "}
        <strong>Alertas</strong> cuando correspondan; también <strong>Usuarios</strong> (solo quienes
        administran cuentas) y esta guía de <strong>Instrucciones</strong>. Si falta alguna, no suele ser un fallo del sistema: casi
        siempre significa que su rol no incluye esa función.
      </p>

      <p style={parrafo}>
        Piense en el panel como el <strong>mostrador único</strong>: entra aquí, elige el módulo
        correcto y recién después capture datos o consulte información.
      </p>

      <p style={parrafo}>
        Antes de registrar entradas, salidas o cualquier movimiento, confirme que está en la pantalla
        adecuada (por ejemplo, Entradas MX frente a Entradas USA) para no volcar información en el
        flujo equivocado.
      </p>

      <p style={{ ...base, margin: 0 }}>
        Desde el panel, y en cada módulo al que tenga acceso, podrá{" "}
        <strong>consultar existencias o reportes</strong>, <strong>dar de alta movimientos</strong>{" "}
        cuando corresponda y <strong>revisar alertas o avisos</strong> según lo que su perfil permita
        ver y hacer.
      </p>
    </div>
  );
}

function ContenidoEntradasMx() {
  const base = styles.placeholder;
  const parrafo: CSSProperties = {
    ...base,
    margin: "0 0 12px 0",
  };

  const listaBase: CSSProperties = {
    ...base,
    margin: "0 0 12px 0",
    paddingLeft: "1.25rem",
  };

  return (
    <div>
      <p
        style={{
          ...base,
          margin: "0 0 14px 0",
          fontWeight: 600,
          color: "#0f172a",
        }}
      >
        Mercancía que entra con origen México
      </p>

      <p style={parrafo}>
        En <strong>Entradas MX</strong> se registran productos, materiales o piezas que ingresan al
        inventario con <strong>origen México</strong>. Use este módulo cuando la compra, recepción o
        ingreso deba quedar reflejado en existencias <strong>MX</strong>, no en el flujo de USA.
      </p>

      <p style={parrafo}>
        Sirve para dejar constancia de compras, recepciones en almacén u otros ingresos de mercancía
        que deben impactar inventario y reportes. Todo lo que guarde aquí debe estar{" "}
        <strong>revisado y completo</strong> antes de confirmar.
      </p>

      <p style={{ ...parrafo, marginBottom: "10px" }}>
        <strong>Paso a paso recomendado</strong>
      </p>

      <ol
        style={{
          ...listaBase,
          listStyleType: "decimal",
          marginBottom: "14px",
        }}
      >
        <li style={{ marginBottom: "12px" }}>
          <strong>Entrar al módulo.</strong> Desde el panel principal, pulse la opción de entradas con
          bandera de México (Entradas MX). Compruebe que el encabezado o el contexto indiquen México,
          para no mezclar con Entradas USA.
        </li>
        <li style={{ marginBottom: "12px" }}>
          <strong>Datos generales de la entrada.</strong> Capture o corrija la información del
          documento o del movimiento: proveedor, número y fecha de factura u orden, totales de
          referencia, archivos o notas del proveedor si la pantalla lo permite. Estos datos identifican
          la entrada y ayudan en auditoría y reportes.
        </li>
        <li style={{ marginBottom: "12px" }}>
          <strong>Productos o renglones.</strong> Agregue cada línea de producto que entra: puede
          añadir filas, duplicar patrones similares o ajustar cantidades según la interfaz. Si la
          entrada trae varios ítems, cargue todos en la misma captura antes de guardar.
        </li>
        <li style={{ marginBottom: "0" }}>
          <strong>Revisión final.</strong> Antes de guardar, recorra <strong>cada</strong> renglón:
          nombre, cantidades, costos y ubicación deben coincidir con lo físico y con el documento.
          Corrija errores en este momento; después del guardado el movimiento ya afecta inventario.
        </li>
      </ol>

      <p style={{ ...parrafo, marginBottom: "8px" }}>
        En cada producto o línea conviene verificar:
      </p>

      <ul
        style={{
          ...listaBase,
          listStyleType: "disc",
        }}
      >
        <li style={{ marginBottom: "6px" }}>
          <strong>Nombre del producto</strong> (que coincida con cómo debe controlarse en inventario).
        </li>
        <li style={{ marginBottom: "6px" }}>
          <strong>Cantidad</strong> y <strong>unidad</strong> (piezas, cajas, kg, etc., según aplique).
        </li>
        <li style={{ marginBottom: "6px" }}>
          <strong>Costo unitario</strong> y <strong>costo total</strong> del renglón, coherentes entre sí
          y con la factura.
        </li>
        <li style={{ marginBottom: "6px" }}>
          <strong>Ubicación</strong> o almacén destino, si el formulario lo solicita.
        </li>
        <li style={{ marginBottom: "6px" }}>
          <strong>Notas</strong> aclaratorias (lote, referencia, incidencias) cuando sea necesario.
        </li>
      </ul>

      <p style={parrafo}>
        Si en una sola captura hay <strong>varios productos</strong>, repase <strong>todos</strong> los
        renglones antes de guardar: un solo ítem mal cargado altera existencias y valorización.
      </p>

      <p style={parrafo}>
        Al <strong>confirmar y guardar</strong> la entrada, el sistema actualiza el inventario con lo
        registrado. Esa operación es la que deja constancia oficial del ingreso para consultas y
        reportes posteriores.
      </p>

      <p style={parrafo}>
        Una captura incorrecta (cantidad, costo, producto equivocado o mezcla MX/USA) puede desajustar{" "}
        <strong>cantidades</strong>, <strong>costos</strong> y <strong>reportes</strong>. Por eso el
        procedimiento habitual debe ser: completar datos, revisar línea por línea y solo entonces
        confirmar.
      </p>

      <p style={{ ...base, margin: 0 }}>
        En resumen: use Entradas MX solo para ingresos con origen México, valide cada campo y cada
        producto, y guarde cuando esté seguro de que la información refleja la realidad del movimiento.
      </p>
    </div>
  );
}

function ContenidoEntradasUsa() {
  const base = styles.placeholder;
  const parrafo: CSSProperties = {
    ...base,
    margin: "0 0 12px 0",
  };

  const listaBase: CSSProperties = {
    ...base,
    margin: "0 0 12px 0",
    paddingLeft: "1.25rem",
  };

  return (
    <div>
      <p
        style={{
          ...base,
          margin: "0 0 14px 0",
          fontWeight: 600,
          color: "#0f172a",
        }}
      >
        Mercancía que entra con origen Estados Unidos
      </p>

      <p style={parrafo}>
        En <strong>Entradas USA</strong> se registran productos, materiales o piezas que ingresan al
        inventario con <strong>origen Estados Unidos</strong>. Úselo cuando la mercancía deba sumarse
        al inventario catalogado como procedente de <strong>USA</strong>, no al de México.
      </p>

      <p style={parrafo}>
        El flujo de trabajo es muy parecido al de <strong>Entradas MX</strong> (cabecera del movimiento,
        líneas de producto, revisión antes de guardar). La diferencia importante es que el sistema{" "}
        <strong>mantiene separados</strong> los movimientos y existencias por origen cuando aplica, de
        modo que reportes y existencias MX y USA reflejan bien la procedencia real.
      </p>

      <p style={parrafo}>
        Separar correctamente cada ingreso ayuda a distinguir compras y recepciones según su procedencia,
        evita mezclar cantidades entre orígenes y facilita auditorías y análisis por zona.
      </p>

      <p style={{ ...parrafo, marginBottom: "10px" }}>
        <strong>Paso a paso recomendado</strong>
      </p>

      <ol
        style={{
          ...listaBase,
          listStyleType: "decimal",
          marginBottom: "14px",
        }}
      >
        <li style={{ marginBottom: "12px" }}>
          <strong>Entrar al módulo.</strong> Desde el panel principal, pulse la opción de entradas con
          bandera de Estados Unidos (<strong>Entradas USA</strong>). Confirme visualmente que está en la
          pantalla correcta y no en Entradas MX.
        </li>
        <li style={{ marginBottom: "12px" }}>
          <strong>Datos generales.</strong> Capture o revise los datos del documento o del movimiento:
          proveedor, número y fecha de factura u orden, totales de referencia, archivo de factura si aplica
          y cualquier campo de cabecera que la pantalla muestre. Esos datos identifican la entrada y
          respaldan el movimiento ante revisiones posteriores.
        </li>
        <li style={{ marginBottom: "12px" }}>
          <strong>Productos o renglones.</strong> Agregue cada línea que corresponda al ingreso: puede
          haber uno o varios productos en la misma captura. Complete todas las filas necesarias antes de
          pasar al paso final.
        </li>
        <li style={{ marginBottom: "0" }}>
          <strong>Revisión antes de guardar.</strong> Verifique <strong>toda</strong> la información:
          cabecera coherente con el documento y cada renglón con cantidades, costos y ubicación acordes a
          lo recibido. Corrija aquí cualquier error; una vez guardado, el movimiento actualiza el
          inventario USA.
        </li>
      </ol>

      <p style={{ ...parrafo, marginBottom: "8px" }}>
        En cada línea conviene validar:
      </p>

      <ul
        style={{
          ...listaBase,
          listStyleType: "disc",
        }}
      >
        <li style={{ marginBottom: "6px" }}>
          <strong>Producto</strong> (nombre o descripción alineada con cómo controla existencias el
          sistema).
        </li>
        <li style={{ marginBottom: "6px" }}>
          <strong>Cantidad</strong> y <strong>unidad</strong> (unidad de medida coherente con la recepción).
        </li>
        <li style={{ marginBottom: "6px" }}>
          <strong>Costo unitario</strong> y <strong>costo total</strong>, que cuadren entre sí y con el
          documento de compra.
        </li>
        <li style={{ marginBottom: "6px" }}>
          <strong>Ubicación</strong> o destino en almacén, si el formulario lo pide.
        </li>
        <li style={{ marginBottom: "6px" }}>
          <strong>Notas</strong> (referencias de envío, incidencias, lotes) si aplican al caso.
        </li>
      </ul>

      <p style={parrafo}>
        <strong>No confunda Entradas MX con Entradas USA.</strong> Un ingreso cargado en el módulo
        equivocado deja las existencias y los reportes desalineados respecto a la procedencia real de la
        mercancía.
      </p>

      <p style={parrafo}>
        Registrar siempre en el <strong>módulo correcto</strong> es lo que mantiene el inventario bien
        separado por origen y permite confiar en los saldos y listados por MX frente a USA.
      </p>

      <p style={parrafo}>
        Al <strong>guardar</strong> la entrada, el sistema actualiza el inventario correspondiente al
        origen USA con lo que acaba de registrar.
      </p>

      <p style={parrafo}>
        Una captura mal hecha (producto equivocado, cantidades o costos incorrectos, o uso del módulo
        incorrecto) puede afectar <strong>existencias</strong> y <strong>reportes</strong>. Por eso debe
        validar todo antes de confirmar.
      </p>

      <p style={{ ...base, margin: 0 }}>
        En resumen: use Entradas USA solo para ingresos con origen Estados Unidos, siga el mismo cuidado
        que en MX, y confirme solo cuando cabecera y cada renglón reflejen fielmente el movimiento.
      </p>
    </div>
  );
}

function ContenidoSalidas() {
  const base = styles.placeholder;
  const parrafo: CSSProperties = {
    ...base,
    margin: "0 0 12px 0",
  };

  const listaBase: CSSProperties = {
    ...base,
    margin: "0 0 12px 0",
    paddingLeft: "1.25rem",
  };

  return (
    <div>
      <p
        style={{
          ...base,
          margin: "0 0 14px 0",
          fontWeight: 600,
          color: "#0f172a",
        }}
      >
        Registrar cuando la mercancía sale del almacén
      </p>

      <p style={parrafo}>
        En <strong>Salidas</strong> se registran productos o materiales que <strong>salen</strong> del
        almacén hacia producción, venta, transferencia o cualquier motivo autorizado. Cada movimiento de
        este tipo debe documentarse aquí cuando corresponda que el sistema descuente existencias.
      </p>

      <p style={parrafo}>
        Este módulo <strong>reduce las existencias</strong> en inventario; por tanto debe usarse con
        cuidado y solo cuando el retiro sea real. Antes de confirmar, revise siempre el{" "}
        <strong>producto</strong> y la <strong>cantidad</strong> que está registrando.
      </p>

      <p style={{ ...parrafo, marginBottom: "10px" }}>
        <strong>Paso a paso recomendado</strong>
      </p>

      <ol
        style={{
          ...listaBase,
          listStyleType: "decimal",
          marginBottom: "14px",
        }}
      >
        <li style={{ marginBottom: "12px" }}>
          <strong>Entrar al módulo.</strong> Desde el panel principal, abra <strong>Salidas</strong> y
          espere a cargar el formulario o listado de registro.
        </li>
        <li style={{ marginBottom: "12px" }}>
          <strong>Seleccionar el producto correcto.</strong> Busque o elija el ítem que realmente sale:
          nombre, código o referencia deben coincidir con lo físico que retira; un producto mal elegido
          descuenta otro artículo en el sistema.
        </li>
        <li style={{ marginBottom: "12px" }}>
          <strong>Cantidad que sale.</strong> Indique la cantidad exacta que abandona el inventario,
          usando la unidad adecuada (piezas, kg, cajas, etc.). Evite estimaciones a la ligera.
        </li>
        <li style={{ marginBottom: "12px" }}>
          <strong>Revisar la información.</strong> Lea de nuevo producto, cantidad, ubicación u otros
          campos que la pantalla muestre; confirme que coinciden con el documento o la orden interna de
          salida.
        </li>
        <li style={{ marginBottom: "0" }}>
          <strong>Confirmar el movimiento.</strong> Guarde o confirme solo cuando esté seguro. Después de
          confirmar, el sistema aplicará la salida al stock.
        </li>
      </ol>

      <p style={parrafo}>
        Cada salida registrada <strong>disminuye el stock disponible</strong> del producto afectado (y
        del origen o ubicación que use la aplicación). Por eso una captura equivocada se traduce en{" "}
        <strong>diferencias de inventario</strong> frente a lo que hay físicamente.
      </p>

      <p style={parrafo}>
        Si se equivoca en <strong>producto</strong>, <strong>cantidad</strong> o{" "}
        <strong>ubicación</strong> cuando el sistema la distingue, el inventario reflejará un saldo
        incorrecto aunque el resto del proceso esté bien. Siempre conviene <strong>revisar antes de
        guardar</strong>.
      </p>

      <p style={{ ...parrafo, marginBottom: "8px" }}>
        Recomendaciones prácticas:
      </p>

      <ul
        style={{
          ...listaBase,
          listStyleType: "disc",
          marginBottom: "14px",
        }}
      >
        <li style={{ marginBottom: "6px" }}>
          <strong>Confirmar el producto exacto</strong> (misma referencia que lo que sale físicamente).
        </li>
        <li style={{ marginBottom: "6px" }}>
          <strong>Revisar la cantidad</strong> dos veces si el movimiento es grande o crítico.
        </li>
        <li style={{ marginBottom: "6px" }}>
          <strong>Evitar registrar dos veces la misma salida</strong>; si hay duda, consulte movimientos
          recientes antes de repetir.
        </li>
        <li style={{ marginBottom: "6px" }}>
          <strong>Validar todo antes de aceptar</strong> o guardar; corregir después suele ser más
          costoso que detenerse un minuto a verificar.
        </li>
      </ul>

      <p style={{ ...base, margin: 0 }}>
        Use Salidas con la misma disciplina que las entradas: un movimiento bien registrado mantiene el
        inventario fiable para su operación y sus reportes.
      </p>
    </div>
  );
}

function ContenidoInventario() {
  const base = styles.placeholder;
  const parrafo: CSSProperties = {
    ...base,
    margin: "0 0 12px 0",
  };

  const listaBase: CSSProperties = {
    ...base,
    margin: "0 0 12px 0",
    paddingLeft: "1.25rem",
  };

  return (
    <div>
      <p
        style={{
          ...base,
          margin: "0 0 14px 0",
          fontWeight: 600,
          color: "#0f172a",
        }}
      >
        Consultar existencias y ubicación
      </p>

      <p style={parrafo}>
        En <strong>Inventario</strong> se consultan las <strong>existencias actuales</strong> que el
        sistema tiene registradas para su organización: es la vista donde se ve qué hay “en libros” según
        los movimientos capturados.
      </p>

      <p style={parrafo}>
        Esta sección le permite saber <strong>qué productos</strong> hay disponibles,{" "}
        <strong>en qué cantidad</strong> y, cuando el diseño lo muestra, <strong>en qué ubicación</strong>{" "}
        o bajo qué referencia de almacén. Según la configuración de la pantalla y su rol, también puede ver
        datos como <strong>mínimos</strong>, <strong>máximos</strong> y <strong>origen</strong> (por
        ejemplo MX o USA), útiles para comparar contra políticas de stock.
      </p>

      <p style={{ ...parrafo, marginBottom: "8px" }}>
        Puede usar Inventario para:
      </p>

      <ul
        style={{
          ...listaBase,
          listStyleType: "disc",
          marginBottom: "14px",
        }}
      >
        <li style={{ marginBottom: "6px" }}>
          <strong>Revisar el stock actual</strong> de un producto o de la lista completa filtrada.
        </li>
        <li style={{ marginBottom: "6px" }}>
          <strong>Validar existencias antes de movimientos</strong> (por ejemplo, antes de registrar una
          salida grande o una transferencia).
        </li>
        <li style={{ marginBottom: "6px" }}>
          <strong>Detectar faltantes</strong> o saldos bajos frente a mínimos, si la vista los muestra.
        </li>
        <li style={{ marginBottom: "6px" }}>
          <strong>Revisar la ubicación</strong> asociada al producto cuando el sistema la guarda por línea.
        </li>
        <li style={{ marginBottom: "6px" }}>
          <strong>Apoyar decisiones de reabastecimiento</strong> al cruzar lo que ve en pantalla con pedidos
          pendientes o rotación habitual.
        </li>
      </ul>

      <p style={parrafo}>
        El inventario <strong>no es estático</strong>: cambia cada vez que se registran{" "}
        <strong>entradas</strong> (compras o ingresos) y <strong>salidas</strong> (retiros). Lo que ve hoy
        es la consecuencia de todos esos movimientos acumulados.
      </p>

      <p style={parrafo}>
        Si una <strong>cantidad le parece incorrecta</strong>, lo razonable es revisar primero los{" "}
        <strong>movimientos recientes</strong> (entradas y salidas) y la coherencia con lo físico, antes de
        asumir un fallo del listado. Muchas discrepancias vienen de una captura mal hecha hace poco.
      </p>

      <p style={parrafo}>
        Una <strong>entrada o salida duplicada</strong>, un producto equivocado o cantidades mal cargadas se
        reflejan directamente en esta vista. Por eso Inventario no es solo consulta: es también un{" "}
        <strong>punto de revisión</strong> para detectar señales de error en la operación diaria.
      </p>

      <p style={{ ...base, margin: 0 }}>
        Úselo con frecuencia para operar con información alineada a lo que el sistema registra; si algo no
        cuadra, cruce con movimientos y corrija en origen para mantener el inventario confiable.
      </p>
    </div>
  );
}

function ContenidoReportes() {
  const base = styles.placeholder;
  const parrafo: CSSProperties = {
    ...base,
    margin: "0 0 12px 0",
  };

  const listaBase: CSSProperties = {
    ...base,
    margin: "0 0 12px 0",
    paddingLeft: "1.25rem",
  };

  return (
    <div>
      <p
        style={{
          ...base,
          margin: "0 0 14px 0",
          fontWeight: 600,
          color: "#0f172a",
        }}
      >
        Información consolidada para revisar el almacén
      </p>

      <p style={parrafo}>
        La sección de <strong>Reportes</strong> le permite consultar información <strong>general y
        detallada</strong> del almacén según los listados que su cuenta tenga habilitados: no sustituye la
        captura diaria, pero sí organiza lo ya registrado para poder leerlo con claridad.
      </p>

      <p style={parrafo}>
        Sirve para revisar <strong>movimientos históricos</strong> (qué entró, qué salió y cuándo), comparar
        períodos y <strong>apoyar decisiones</strong>: compras, priorización de revisión física o seguimiento
        de irregularidades.
      </p>

      <p style={parrafo}>
        Según las opciones que vea en pantalla, suele poder abrir reportes de{" "}
        <strong>entradas</strong>, <strong>salidas</strong>, <strong>inventario general</strong> u otros
        listados por origen (por ejemplo MX y USA), además de accesos relacionados con{" "}
        <strong>alertas</strong> cuando existan en su flujo de trabajo.
      </p>

      <p style={{ ...parrafo, marginBottom: "8px" }}>
        Los reportes le ayudan sobre todo a:
      </p>

      <ul
        style={{
          ...listaBase,
          listStyleType: "disc",
          marginBottom: "14px",
        }}
      >
        <li style={{ marginBottom: "6px" }}>
          <strong>Validar capturas</strong>: contrastar si lo registrado coincide con documentos o con lo que
          recuerda haber cargado.
        </li>
        <li style={{ marginBottom: "6px" }}>
          <strong>Detectar diferencias</strong> o inconsistencias entre movimientos y existencias en un
          periodo.
        </li>
        <li style={{ marginBottom: "6px" }}>
          <strong>Revisar existencias</strong> desde una vista tabular o resumen, según el reporte.
        </li>
        <li style={{ marginBottom: "6px" }}>
          <strong>Identificar productos de alta rotación</strong> al observar volumen de entradas y salidas en
          el tiempo.
        </li>
        <li style={{ marginBottom: "6px" }}>
          <strong>Detectar productos bajos o faltantes</strong> cuando el listado o las alertas lo permitan.
        </li>
      </ul>

      <p style={parrafo}>
        Los reportes <strong>dependen por completo</strong> de la información que se haya capturado en
        entradas, salidas e inventario. Son un espejo del sistema: si los datos de origen son correctos, el
        reporte será útil; si no, reflejará también ese problema.
      </p>

      <p style={parrafo}>
        Si un movimiento quedó <strong>mal registrado</strong> (cantidad, producto, duplicado o módulo
        equivocado), eso puede verse reflejado en totales, listados y cruces de reportes. No siempre es un
        “error del reporte”, sino la consecuencia de una captura anterior.
      </p>

      <p style={{ ...base, margin: 0 }}>
        Por eso conviene <strong>capturar bien desde el origen</strong> cada entrada y salida; los reportes
        entonces le darán una lectura confiable del almacén y le ahorrarán tiempo al auditar o planificar.
      </p>
    </div>
  );
}

function ContenidoAlertas() {
  const base = styles.placeholder;
  const parrafo: CSSProperties = {
    ...base,
    margin: "0 0 12px 0",
  };

  return (
    <div>
      <p
        style={{
          ...base,
          margin: "0 0 14px 0",
          fontWeight: 600,
          color: "#0f172a",
        }}
      >
        Cuándo un producto necesita atención
      </p>

      <p style={parrafo}>
        La sección de <strong>Alertas</strong> muestra productos cuya <strong>cantidad actual</strong> en
        inventario está <strong>por debajo del nivel mínimo</strong> esperado o configurado para ese ítem.
        Es una lista de “semáforo” para saber dónde el stock ya está estrecho.
      </p>

      <p style={parrafo}>
        Sirve para <strong>detectar rápidamente</strong> qué referencias necesitan atención, compra o
        reabastecimiento, sin tener que revisar manualmente todo el inventario línea por línea cada día.
      </p>

      <p style={parrafo}>
        Las alertas ayudan a <strong>anticiparse</strong>: pueden disparar una orden de compra, una entrada
        urgente o una revisión física antes de quedarse sin material que la operación requiere.
      </p>

      <p style={parrafo}>
        Cuando <strong>entra más producto</strong> (por una entrada bien registrada) y la cantidad disponible{" "}
        <strong>sube por encima del mínimo</strong>, esa alerta puede <strong>desaparecer</strong> del
        listado porque el sistema ya no considera el ítem en riesgo.
      </p>

      <p style={parrafo}>
        Si la cantidad <strong>sigue igual o sigue por debajo del mínimo</strong>, la alerta{" "}
        <strong>permanece activa</strong> hasta que el inventario alcance el umbral configurado (o hasta que
        se ajuste la política de mínimos, si su proceso lo permite).
      </p>

      <p style={parrafo}>
        Revisar alertas <strong>con frecuencia</strong> (por ejemplo al inicio del día o tras bloques de
        salidas) ayuda a mantener la operación <strong>ordenada</strong> y a reducir parones por falta de
        stock.
      </p>

      <p style={{ ...base, margin: 0 }}>
        Una alerta <strong>no siempre significa que hubo un error</strong>: muchas veces solo indica{" "}
        <strong>necesidad de reposición</strong> o consumo normal más rápido de lo previsto. Úsela como guía
        prioritaria, no como alarma de fallo salvo que combine con otras señales de captura incorrecta.
      </p>
    </div>
  );
}

function ContenidoUsuarios() {
  const base = styles.placeholder;
  const parrafo: CSSProperties = {
    ...base,
    margin: "0 0 12px 0",
  };

  const listaBase: CSSProperties = {
    ...base,
    margin: "0 0 12px 0",
    paddingLeft: "1.25rem",
  };

  return (
    <div>
      <p
        style={{
          ...base,
          margin: "0 0 14px 0",
          fontWeight: 600,
          color: "#0f172a",
        }}
      >
        Quién entra al sistema y con qué permisos
      </p>

      <p style={parrafo}>
        La <strong>gestión de usuarios</strong> permite definir <strong>quién puede acceder</strong> a la
        aplicación y <strong>qué nivel de permisos</strong> tiene cada persona: consulta, operación o
        administración, según el rol asignado.
      </p>

      <p style={parrafo}>
        Por política de seguridad, <strong>solo quienes tienen permisos adecuados</strong> —en la práctica,
        casi siempre un <strong>administrador</strong>— pueden dar de alta <strong>usuarios internos</strong>{" "}
        nuevos dentro de su empresa. Si usted no ve esta opción en el panel, su perfil no incluye esa función.
      </p>

      <p style={{ ...parrafo, marginBottom: "8px" }}>
        Para <strong>crear un usuario interno</strong>, el administrador suele capturar únicamente:
      </p>

      <ul
        style={{
          ...listaBase,
          listStyleType: "disc",
          marginBottom: "14px",
        }}
      >
        <li style={{ marginBottom: "6px" }}>
          <strong>Nombre</strong> (identificación del colaborador en la lista de usuarios).
        </li>
        <li style={{ marginBottom: "6px" }}>
          <strong>Usuario (login)</strong>: el identificador con el que esa persona iniciará sesión (no es el
          correo en este flujo).
        </li>
        <li style={{ marginBottom: "6px" }}>
          <strong>Rol</strong>: el nivel de acceso que tendrá en el sistema.
        </li>
      </ul>

      <p style={parrafo}>
        El sistema <strong>genera automáticamente una contraseña temporal</strong>. El administrador debe{" "}
        <strong>entregarla de forma segura</strong> al colaborador (en persona, por canal confidencial o
        política que defina la empresa) para que pueda hacer su <strong>primer acceso</strong>.
      </p>

      <p style={parrafo}>
        En el <strong>primer ingreso</strong>, el usuario deberá <strong>cambiar esa contraseña de forma
        obligatoria</strong>; hasta completar ese paso no podrá usar el resto de la aplicación con normalidad.
        La contraseña temporal deja de valer una vez definida la nueva.
      </p>

      <p style={{ ...parrafo, marginBottom: "8px" }}>
        Los <strong>roles</strong> definen, en términos generales, lo que cada perfil puede hacer:
      </p>

      <ul
        style={{
          ...listaBase,
          listStyleType: "disc",
          marginBottom: "14px",
        }}
      >
        <li style={{ marginBottom: "6px" }}>
          <strong>Admin (administrador)</strong>: acceso amplio a la operación del almacén y capacidad de{" "}
          <strong>gestionar usuarios</strong> y configuraciones que el sistema reserve a ese nivel.
        </li>
        <li style={{ marginBottom: "6px" }}>
          <strong>Manager</strong>: acceso <strong>operativo</strong> para registrar y consultar según la
          lógica del sistema (entradas, salidas, inventario, reportes, etc.), sin las funciones reservadas al
          administrador.
        </li>
        <li style={{ marginBottom: "6px" }}>
          <strong>Viewer</strong>: perfil orientado a <strong>consulta o visualización</strong>, con menos o
          ninguna capacidad de modificar datos críticos, según cómo esté definido en la aplicación.
        </li>
      </ul>

      <p style={parrafo}>
        <strong>Cada persona debe usar su propia cuenta.</strong> No se recomienda compartir usuario ni
        contraseña entre varios empleados: dificulta saber quién hizo cada movimiento y debilita la
        seguridad.
      </p>

      <p style={parrafo}>
        Tener <strong>cuentas separadas</strong> permite mantener <strong>control</strong>, trazabilidad y{" "}
        <strong>seguridad</strong> razonables en el día a día del almacén.
      </p>

      <p style={{ ...base, margin: 0 }}>
        Los usuarios dados de alta en su empresa pertenecen a <strong>esa organización</strong> en el
        sistema: no deben mezclarse con usuarios de otra empresa; lo que cada uno ve y modifica queda
        acotado a su propio contexto operativo.
      </p>
    </div>
  );
}
