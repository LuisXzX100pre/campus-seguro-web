import { useEffect, useMemo, useRef, useState } from "react"
import {
  Routes,
  Route,
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom"
import { Html5Qrcode } from "html5-qrcode"
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore"
import { db } from "./firebase"

const ADMIN_PIN = "1234"
const STUDENT_KEY = "campusSeguroStudent"

const CAREERS = [
  "TSU Desarrollo de Software Multiplataforma",
  "Ingeniería en Desarrollo y Gestión de Software",
  "Gastronomía",
  "Turismo",
  "Mantenimiento",
  "Otra",
]

function getSavedStudent() {
  try {
    return JSON.parse(localStorage.getItem(STUDENT_KEY))
  } catch {
    return null
  }
}

function saveStudent(student) {
  localStorage.setItem(STUDENT_KEY, JSON.stringify(student))
}

function removeStudent() {
  localStorage.removeItem(STUDENT_KEY)
}

function extractSessionId(value) {
  try {
    const url = new URL(value)
    return url.searchParams.get("session") || value
  } catch {
    return value
  }
}

function formatDate(value) {
  if (!value) return "—"

  const date = value.toDate ? value.toDate() : new Date(value)

  return date.toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/registro" element={<RegisterPage />} />
      <Route path="/vincular" element={<PairingPage />} />
      <Route path="/vinculado" element={<LinkedSuccessPage />} />
      <Route path="/admin" element={<AdminPanel />} />
    </Routes>
  )
}

function PhoneFrame({ children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#202020] px-4 py-8">
      <section className="relative min-h-[760px] w-full max-w-[390px] overflow-hidden rounded-[38px] bg-white px-7 py-12 shadow-[0_0_0_8px_#050505,0_0_0_11px_#333]">
        <div className="absolute left-1/2 top-3 h-7 w-28 -translate-x-1/2 rounded-full bg-black" />
        {children}
      </section>
    </main>
  )
}

function LogoHeader({ small = false }) {
  return (
    <div
      className={`flex items-center justify-center gap-4 ${
        small ? "mb-6" : "mb-8"
      }`}
    >
      <div
        className={`${
          small ? "text-4xl" : "text-5xl"
        } font-black italic leading-none text-[#009B86]`}
      >
        UT
      </div>

      <div className="h-12 w-px bg-black/40" />

      <div
        className={`${
          small ? "text-4xl" : "text-5xl"
        } font-black leading-none text-[#009B86]`}
      >
        BIS
      </div>
    </div>
  )
}

function Landing() {
  const student = getSavedStudent()

  return (
    <PhoneFrame>
      <div className="pt-8 text-center">
        <LogoHeader />

        <h1 className="text-2xl font-black text-[#009B86]">Campus Seguro</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Sistema de Alertas de Emergencia
        </p>

        <div className="mt-9 rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-5 text-sm leading-6 text-zinc-600">
          <p>
            Aplicación para smartwatch orientada a mejorar la{" "}
            <strong className="text-[#009B86]">
              seguridad dentro de la UT Cancún.
            </strong>
          </p>

          <p className="mt-1">
            Registra tu matrícula, vincula tu reloj y envía alertas rápidas
            desde el wearable.
          </p>
        </div>

        <div className="mt-8 grid gap-4">
          <InfoCard
            title="Alertas rápidas"
            text="Reporta emergencias desde tu reloj."
          />

          <InfoCard
            title="Trazabilidad institucional"
            text="Cada alerta queda ligada a una matrícula."
          />

          <InfoCard
            title="Seguridad Universitaria"
            text="Validación profesional antes de su difusión."
          />
        </div>

        <div className="mt-9 grid gap-3">
          <Link
            to={student ? "/vincular" : "/registro"}
            className="rounded-xl bg-gradient-to-r from-[#3CA99A] to-[#7ADFD3] px-5 py-4 text-center text-lg font-black text-white shadow-lg shadow-teal-500/20"
          >
            {student ? "Vincular Wearable" : "Registrarme"}
          </Link>
        </div>
      </div>
    </PhoneFrame>
  )
}

function InfoCard({ title, text }) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-white px-5 py-4 text-center shadow-sm">
      <h3 className="text-sm font-black text-zinc-800">{title}</h3>
      <p className="mt-1 text-xs text-zinc-500">{text}</p>
    </div>
  )
}

function RegisterPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    nombre: "",
    matricula: "",
    carrera: CAREERS[0],
    grupo: "",
    correo: "",
    telefono: "",
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  function updateField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage("")

    const nombre = form.nombre.trim()
    const matricula = form.matricula.trim().toUpperCase()
    const carrera = form.carrera.trim()
    const grupo = form.grupo.trim().toUpperCase()
    const correo = form.correo.trim()
    const telefono = form.telefono.trim()

    if (!nombre || !matricula || !carrera || !grupo) {
      setMessage("Completa nombre, matrícula, carrera y grupo.")
      return
    }

    try {
      setLoading(true)

      const student = {
        id: matricula,
        nombre,
        matricula,
        carrera,
        grupo,
        correo,
        telefono,
        role: "student",
        wearableLinked: false,
        updatedAt: new Date().toISOString(),
      }

      await setDoc(
        doc(db, "users", matricula),
        {
          ...student,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      )

      saveStudent(student)
      navigate("/vincular")
    } catch (error) {
      console.error(error)
      setMessage("No se pudo registrar. Revisa Firebase o tu conexión.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <PhoneFrame>
      <Link to="/" className="absolute left-7 top-12 text-2xl text-zinc-400">
        ←
      </Link>

      <div className="pt-8">
        <LogoHeader small />

        <div className="text-center">
          <h1 className="text-2xl font-black text-zinc-900">
            Registro de alumno
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Ingresa tus datos institucionales.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
          <Input
            label="Nombre completo"
            value={form.nombre}
            onChange={(e) => updateField("nombre", e.target.value)}
            placeholder="Ej. Luis Fernando Núñez"
          />

          <Input
            label="Matrícula"
            value={form.matricula}
            onChange={(e) => updateField("matricula", e.target.value)}
            placeholder="Ej. 22304567"
          />

          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-wide text-zinc-500">
              Carrera
            </span>

            <select
              value={form.carrera}
              onChange={(e) => updateField("carrera", e.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#009B86]"
            >
              {CAREERS.map((career) => (
                <option key={career} value={career}>
                  {career}
                </option>
              ))}
            </select>
          </label>

          <Input
            label="Grupo"
            value={form.grupo}
            onChange={(e) => updateField("grupo", e.target.value)}
            placeholder="Ej. 8A"
          />

          <Input
            label="Correo institucional opcional"
            value={form.correo}
            onChange={(e) => updateField("correo", e.target.value)}
            placeholder="correo@utcancun.edu.mx"
          />

          <Input
            label="Teléfono opcional"
            value={form.telefono}
            onChange={(e) => updateField("telefono", e.target.value)}
            placeholder="998..."
          />

          {message && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-600">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-xl bg-gradient-to-r from-[#3CA99A] to-[#7ADFD3] px-5 py-4 text-lg font-black text-white shadow-lg shadow-teal-500/20 disabled:opacity-60"
          >
            {loading ? "Registrando..." : "Continuar"}
          </button>
        </form>
      </div>
    </PhoneFrame>
  )
}

function Input({ label, ...props }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black uppercase tracking-wide text-zinc-500">
        {label}
      </span>

      <input
        {...props}
        className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#009B86]"
      />
    </label>
  )
}

function PairingPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const scannerRef = useRef(null)

  const [student, setStudent] = useState(() => getSavedStudent())
  const [sessionId, setSessionId] = useState(searchParams.get("session") || "")
  const [manualSession, setManualSession] = useState("")
  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const finalSession = useMemo(() => {
    return (sessionId || manualSession).trim().toUpperCase()
  }, [sessionId, manualSession])

  useEffect(() => {
    if (!scanning || sessionId) return

    let html5QrCode = null

    async function startCamera() {
      try {
        setCameraError("")

        const isSecure =
          window.location.protocol === "https:" ||
          window.location.hostname === "localhost"

        if (!isSecure) {
          setCameraError("La cámara solo funciona en HTTPS o localhost.")
          setScanning(false)
          return
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraError("Tu navegador no permite usar la cámara.")
          setScanning(false)
          return
        }

        html5QrCode = new Html5Qrcode("qr-reader")
        scannerRef.current = html5QrCode

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: {
              width: 220,
              height: 220,
            },
          },
          async (decodedText) => {
            const extracted = extractSessionId(decodedText).trim().toUpperCase()

            setSessionId(extracted)
            setMessage("Código detectado correctamente.")
            setScanning(false)

            try {
              await html5QrCode.stop()
              await html5QrCode.clear()
            } catch {
              // No pasa nada si ya se cerró
            }
          },
          () => {}
        )
      } catch (error) {
        console.error(error)
        setCameraError(
          "No se pudo abrir la cámara. Revisa permisos del navegador."
        )
        setScanning(false)
      }
    }

    startCamera()

    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current?.clear())
          .catch(() => {})
      }
    }
  }, [scanning, sessionId])

  async function handleLink(e) {
    e.preventDefault()

    if (!student) {
      setMessage("Primero debes registrarte.")
      return
    }

    if (!finalSession) {
      setMessage("Escanea o ingresa el código del reloj.")
      return
    }

    try {
      setLoading(true)
      setMessage("")

      const sessionData = {
        sessionId: finalSession,
        status: "linked",
        userId: student.matricula,
        nombre: student.nombre,
        matricula: student.matricula,
        carrera: student.carrera,
        grupo: student.grupo,
        correo: student.correo || "",
        telefono: student.telefono || "",
        linkedAt: serverTimestamp(),
      }

      await setDoc(doc(db, "pairingSessions", finalSession), sessionData, {
        merge: true,
      })

      await setDoc(
        doc(db, "users", student.matricula),
        {
          wearableLinked: true,
          linkedSessionId: finalSession,
          linkedAt: serverTimestamp(),
        },
        { merge: true }
      )

      const updatedStudent = {
        ...student,
        wearableLinked: true,
        linkedSessionId: finalSession,
      }

      saveStudent(updatedStudent)
      setStudent(updatedStudent)

      navigate("/vinculado")
    } catch (error) {
      console.error(error)
      setMessage("No se pudo vincular. Revisa Firebase o tu conexión.")
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    removeStudent()
    navigate("/registro")
  }

  return (
    <PhoneFrame>
      <Link to="/" className="absolute left-7 top-12 text-2xl text-zinc-400">
        ←
      </Link>

      <div className="pt-8">
        <LogoHeader small />

        <div className="text-center">
          <h1 className="text-2xl font-black text-zinc-900">Vincular reloj</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Escanea el código QR que aparece en el smartwatch.
          </p>
        </div>

        {!student ? (
          <div className="mt-10 rounded-2xl border border-red-100 bg-red-50 p-5 text-center">
            <p className="text-sm font-bold text-red-600">
              No hay alumno registrado en este teléfono.
            </p>

            <Link
              to="/registro"
              className="mt-5 block rounded-xl bg-red-600 px-5 py-3 font-black text-white"
            >
              Registrarme
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
              <p className="text-xs font-black uppercase text-zinc-400">
                Alumno registrado
              </p>

              <p className="mt-1 text-sm font-black text-zinc-900">
                {student.nombre}
              </p>

              <p className="text-xs text-zinc-500">
                Matrícula {student.matricula} · Grupo {student.grupo}
              </p>

              <button
                onClick={handleLogout}
                className="mt-3 text-xs font-bold text-red-500"
              >
                Cambiar alumno
              </button>
            </div>

            <div className="mt-7 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
              {sessionId ? (
                <div className="grid min-h-[210px] place-items-center text-center">
                  <div>
                    <p className="text-sm font-black text-zinc-900">
                      Código detectado
                    </p>

                    <p className="mt-2 rounded-xl bg-zinc-100 px-4 py-3 text-lg font-black text-[#009B86]">
                      {sessionId}
                    </p>

                    <button
                      onClick={() => {
                        setSessionId("")
                        setManualSession("")
                        setMessage("")
                        setCameraError("")
                      }}
                      className="mt-4 text-xs font-bold text-zinc-400"
                    >
                      Escanear otro código
                    </button>
                  </div>
                </div>
              ) : scanning ? (
                <div className="overflow-hidden rounded-xl">
                  <div id="qr-reader" className="w-full" />
                </div>
              ) : (
                <div className="grid min-h-[210px] place-items-center text-center">
                  <div>
                    <div className="mx-auto grid h-24 w-24 place-items-center rounded-3xl bg-zinc-100 text-4xl">
                      ▦
                    </div>

                    <button
                      onClick={() => {
                        setCameraError("")
                        setMessage("")
                        setScanning(true)
                      }}
                      className="mt-6 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-black text-white"
                    >
                      Iniciar escaneo
                    </button>

                    <p className="mt-3 text-xs text-zinc-400">
                      El navegador pedirá permiso para usar la cámara.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {cameraError && (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-600">
                {cameraError}
              </p>
            )}

            <form onSubmit={handleLink} className="mt-5 grid gap-4">
              {!sessionId && (
                <Input
                  label="Código manual del reloj"
                  value={manualSession}
                  onChange={(e) => setManualSession(e.target.value)}
                  placeholder="Ej. CSW-ABC123"
                />
              )}

              {message && (
                <p className="rounded-xl bg-zinc-50 px-4 py-3 text-center text-sm font-bold text-zinc-600">
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-[#3CA99A] to-[#7ADFD3] px-5 py-4 text-lg font-black text-white shadow-lg shadow-teal-500/20 disabled:opacity-60"
              >
                {loading ? "Vinculando..." : "Vincular Wearable"}
              </button>
            </form>
          </>
        )}
      </div>
    </PhoneFrame>
  )
}

function LinkedSuccessPage() {
  const student = getSavedStudent()

  return (
    <PhoneFrame>
      <div className="flex min-h-[650px] flex-col items-center justify-center text-center">
        <div className="grid h-28 w-28 place-items-center rounded-full bg-[#009B86] text-5xl font-black text-white">
          ✓
        </div>

        <h1 className="mt-8 text-2xl font-black text-zinc-900">
          Wearable vinculado
        </h1>

        <p className="mt-3 max-w-[270px] text-sm leading-6 text-zinc-500">
          El reloj quedó asociado correctamente a la matrícula{" "}
          <strong className="text-[#009B86]">
            {student?.matricula || "—"}
          </strong>
          .
        </p>

        <Link
          to="/"
          className="mt-10 w-full rounded-xl bg-gradient-to-r from-[#3CA99A] to-[#7ADFD3] px-5 py-4 text-lg font-black text-white shadow-lg shadow-teal-500/20"
        >
          Ir al inicio
        </Link>
      </div>
    </PhoneFrame>
  )
}

function AdminPanel() {
  const [pin, setPin] = useState("")
  const [allowed, setAllowed] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [users, setUsers] = useState([])
  const [tab, setTab] = useState("alerts")

  useEffect(() => {
    if (!allowed) return

    const alertsQuery = query(collection(db, "alerts"), orderBy("createdAt", "desc"))
    const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"))

    const unsubAlerts = onSnapshot(alertsQuery, (snapshot) => {
      setAlerts(
        snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
      )
    })

    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      setUsers(
        snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
      )
    })

    return () => {
      unsubAlerts()
      unsubUsers()
    }
  }, [allowed])

  async function updateStatus(alertId, status) {
    await updateDoc(doc(db, "alerts", alertId), {
      estado: status,
      status,
      reviewedAt: serverTimestamp(),
    })
  }

  if (!allowed) {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-100 px-4">
        <section className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-xl">
          <div className="mx-auto h-20 w-20 rounded-full bg-[#009B86]" />

          <h1 className="mt-6 text-center text-2xl font-black text-zinc-900">
            Panel Administrador
          </h1>

          <p className="mt-2 text-center text-sm text-zinc-500">
            Ingresa el PIN de Seguridad Universitaria.
          </p>

          <input
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN"
            type="password"
            className="mt-6 w-full rounded-xl border border-zinc-200 px-4 py-3 text-center text-lg font-black outline-none focus:border-[#009B86]"
          />

          <button
            onClick={() => setAllowed(pin === ADMIN_PIN)}
            className="mt-4 w-full rounded-xl bg-[#009B86] px-5 py-4 font-black text-white"
          >
            Entrar
          </button>
        </section>
      </main>
    )
  }

  const pendingAlerts = alerts.filter(
    (alert) => (alert.estado || alert.status) === "pendiente"
  ).length

  return (
    <main className="min-h-screen bg-white">
      <aside className="fixed left-0 top-0 hidden h-full w-60 bg-[#243847] p-7 text-white lg:block">
        <div className="mx-auto h-20 w-20 rounded-full bg-[#009B86]" />
        <p className="mt-4 text-center text-sm font-bold">Administrador</p>

        <nav className="mt-12 grid gap-3">
          <button
            onClick={() => setTab("alerts")}
            className={`rounded-xl px-4 py-3 text-left text-sm font-bold ${
              tab === "alerts" ? "bg-white/15" : "hover:bg-white/10"
            }`}
          >
            Alertas
          </button>

          <button
            onClick={() => setTab("users")}
            className={`rounded-xl px-4 py-3 text-left text-sm font-bold ${
              tab === "users" ? "bg-white/15" : "hover:bg-white/10"
            }`}
          >
            Alumnos
          </button>
        </nav>
      </aside>

      <section className="p-5 lg:ml-60 lg:p-10">
        <div className="flex flex-col gap-4 border-b border-zinc-200 pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-black text-zinc-900">Campus Seguro</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Panel de control de alertas y alumnos registrados.
            </p>
          </div>

          <div className="flex gap-3 lg:hidden">
            <button
              onClick={() => setTab("alerts")}
              className="rounded-xl bg-[#243847] px-4 py-2 text-sm font-bold text-white"
            >
              Alertas
            </button>

            <button
              onClick={() => setTab("users")}
              className="rounded-xl bg-[#009B86] px-4 py-2 text-sm font-bold text-white"
            >
              Alumnos
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <StatCard title="Alertas totales" value={alerts.length} />
          <StatCard title="Pendientes" value={pendingAlerts} />
          <StatCard title="Alumnos registrados" value={users.length} />
        </div>

        {tab === "alerts" ? (
          <AlertsTable alerts={alerts} updateStatus={updateStatus} />
        ) : (
          <UsersTable users={users} />
        )}
      </section>
    </main>
  )
}

function StatCard({ title, value }) {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-5">
      <p className="text-sm font-bold text-zinc-500">{title}</p>
      <p className="mt-2 text-4xl font-black text-zinc-900">{value}</p>
    </div>
  )
}

function AlertsTable({ alerts, updateStatus }) {
  return (
    <div className="mt-8 overflow-x-auto rounded-2xl border border-zinc-200">
      <table className="w-full min-w-[900px] border-collapse bg-white">
        <thead>
          <tr className="bg-zinc-50">
            <th className="border-b border-zinc-200 px-5 py-4 text-left text-sm font-black">
              Alumno
            </th>
            <th className="border-b border-zinc-200 px-5 py-4 text-left text-sm font-black">
              Matrícula
            </th>
            <th className="border-b border-zinc-200 px-5 py-4 text-left text-sm font-black">
              Alerta
            </th>
            <th className="border-b border-zinc-200 px-5 py-4 text-left text-sm font-black">
              Ubicación
            </th>
            <th className="border-b border-zinc-200 px-5 py-4 text-left text-sm font-black">
              Fecha
            </th>
            <th className="border-b border-zinc-200 px-5 py-4 text-left text-sm font-black">
              Estado
            </th>
            <th className="border-b border-zinc-200 px-5 py-4 text-left text-sm font-black">
              Validación
            </th>
          </tr>
        </thead>

        <tbody>
          {alerts.length === 0 ? (
            <tr>
              <td
                colSpan="7"
                className="px-5 py-10 text-center text-sm text-zinc-500"
              >
                No hay alertas registradas.
              </td>
            </tr>
          ) : (
            alerts.map((alert) => {
              const estado = alert.estado || alert.status || "pendiente"

              return (
                <tr key={alert.id} className="border-b border-zinc-100">
                  <td className="px-5 py-4 text-sm font-bold">
                    {alert.nombre || alert.studentName || "—"}
                  </td>

                  <td className="px-5 py-4 text-sm">
                    {alert.matricula || "—"}
                  </td>

                  <td className="px-5 py-4 text-sm">
                    {alert.categoria || alert.title || alert.type || "—"}
                  </td>

                  <td className="px-5 py-4 text-sm">
                    Edificio {alert.edificio || alert.building || "—"}
                  </td>

                  <td className="px-5 py-4 text-sm">
                    {formatDate(alert.createdAt)}
                  </td>

                  <td className="px-5 py-4 text-sm">
                    <StatusBadge estado={estado} />
                  </td>

                  <td className="px-5 py-4 text-sm">
                    {estado === "pendiente" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus(alert.id, "aceptada")}
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white"
                        >
                          Aceptar
                        </button>

                        <button
                          onClick={() => updateStatus(alert.id, "rechazada")}
                          className="rounded-lg bg-red-600 px-3 py-2 text-xs font-black text-white"
                        >
                          Rechazar
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-zinc-400">
                        Revisada
                      </span>
                    )}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

function UsersTable({ users }) {
  return (
    <div className="mt-8 overflow-x-auto rounded-2xl border border-zinc-200">
      <table className="w-full min-w-[850px] border-collapse bg-white">
        <thead>
          <tr className="bg-zinc-50">
            <th className="border-b border-zinc-200 px-5 py-4 text-left text-sm font-black">
              Nombre
            </th>
            <th className="border-b border-zinc-200 px-5 py-4 text-left text-sm font-black">
              Matrícula
            </th>
            <th className="border-b border-zinc-200 px-5 py-4 text-left text-sm font-black">
              Carrera
            </th>
            <th className="border-b border-zinc-200 px-5 py-4 text-left text-sm font-black">
              Grupo
            </th>
            <th className="border-b border-zinc-200 px-5 py-4 text-left text-sm font-black">
              Wearable
            </th>
            <th className="border-b border-zinc-200 px-5 py-4 text-left text-sm font-black">
              Registro
            </th>
          </tr>
        </thead>

        <tbody>
          {users.length === 0 ? (
            <tr>
              <td
                colSpan="6"
                className="px-5 py-10 text-center text-sm text-zinc-500"
              >
                No hay alumnos registrados.
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user.id} className="border-b border-zinc-100">
                <td className="px-5 py-4 text-sm font-bold">{user.nombre}</td>
                <td className="px-5 py-4 text-sm">{user.matricula}</td>
                <td className="px-5 py-4 text-sm">{user.carrera}</td>
                <td className="px-5 py-4 text-sm">{user.grupo}</td>

                <td className="px-5 py-4 text-sm">
                  {user.wearableLinked ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                      Vinculado
                    </span>
                  ) : (
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-500">
                      Pendiente
                    </span>
                  )}
                </td>

                <td className="px-5 py-4 text-sm">
                  {formatDate(user.createdAt)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function StatusBadge({ estado }) {
  const styles = {
    pendiente: "bg-yellow-100 text-yellow-800",
    aceptada: "bg-emerald-100 text-emerald-700",
    rechazada: "bg-red-100 text-red-700",
  }

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${
        styles[estado] || "bg-zinc-100 text-zinc-600"
      }`}
    >
      {estado}
    </span>
  )
}