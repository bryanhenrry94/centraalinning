export default function ParameterCategoriesGrid() {
  const categories = [
    {
      id: 1,
      title: "General",
      description: "Configuración básica del sistema",
      parameters: 9,
      status: "Activo",
      icon: "⚙️",
    },
    {
      id: 2,
      title: "Gestión de Participantes",
      description: "Reglas y costos de participación",
      parameters: 12,
      status: "Activo",
      icon: "👥",
    },
    {
      id: 3,
      title: "Registro de Acuerdos",
      description: "Configuración de registros y documentos",
      parameters: 10,
      status: "Activo",
      icon: "📄",
    },
    {
      id: 4,
      title: "Seguimiento Administrativo",
      description: "Flujos y plazos administrativos",
      parameters: 13,
      status: "Activo",
      icon: "⚖️",
    },
    {
      id: 5,
      title: "Gestión Financiera",
      description: "Reglas de costos y facturación",
      parameters: 11,
      status: "Activo",
      icon: "💰",
    },
    {
      id: 6,
      title: "Reglas de Pago",
      description: "Términos y tiempos de pago",
      parameters: 8,
      status: "Activo",
      icon: "📅",
    },
    {
      id: 7,
      title: "Verificaciones KYC",
      description: "Parámetros de validación y verificación",
      parameters: 9,
      status: "Activo",
      icon: "🛡️",
    },
    {
      id: 8,
      title: "Declaración Financiera",
      description: "Configuración de declaraciones",
      parameters: 7,
      status: "Activo",
      icon: "📊",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Parámetros Globales
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestiona la configuración central de todo el sistema CFSB
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            Restablecer valores
          </button>

          <button className="rounded-xl bg-[#0B1F4D] px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-950/20 transition hover:opacity-90">
            Guardar cambios
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-6 border-b border-slate-200">
        {[
          "Todos los Parámetros",
          "Administración",
          "Financiero",
          "Cumplimiento",
          "Comunicación",
          "Sistema y Seguridad",
        ].map((tab, index) => (
          <button
            key={tab}
            className={`border-b-2 pb-3 text-sm font-medium transition ${
              index === 0
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {categories.map((category) => (
          <button
            key={category.id}
            className="group rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200/60"
          >
            {/* Top */}
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                {category.icon}
              </div>

              <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {category.status}
              </div>
            </div>

            {/* Content */}
            <div className="mt-5">
              <h3 className="text-base font-semibold text-slate-900 transition group-hover:text-blue-700">
                {category.id}. {category.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {category.description}
              </p>
            </div>

            {/* Footer */}
            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
              <div>
                <p className="text-xs text-slate-400">Parámetros</p>
                <p className="text-sm font-semibold text-slate-700">
                  {category.parameters} configuraciones
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition group-hover:bg-blue-600 group-hover:text-white">
                →
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Bottom Layout */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Recent Activity */}
        <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Actividad Reciente
              </h2>
              <p className="text-sm text-slate-500">
                Últimos cambios realizados en los parámetros
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {[
              "Cambio en importe mínimo de cobro",
              "Actualización de reglas KYC",
              "Modificación de costos administrativos",
              "Actualización de plantillas de comunicación",
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-xl border border-slate-100 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm">
                    📝
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-800">{item}</p>
                    <p className="text-xs text-slate-500">
                      Admin CFSB • Hace 2 horas
                    </p>
                  </div>
                </div>

                <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
                  Ver
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Acciones Rápidas
          </h2>

          <div className="mt-6 space-y-3">
            {[
              "Exportar configuración",
              "Importar configuración",
              "Clonar entorno",
              "Restaurar respaldo",
            ].map((action) => (
              <button
                key={action}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-4 text-left transition hover:border-blue-200 hover:bg-slate-50"
              >
                <span className="text-sm font-medium text-slate-700">
                  {action}
                </span>

                <span className="text-slate-400">→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
