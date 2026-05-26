"use client";

import Swal from "sweetalert2";
import { CheckCircle2, MapPin, Phone } from "lucide-react";

type DeliveryOrder = {
  id: number;
  total: number;
  customer_name: string;
  address: string;
  phone: string;
};

export default function DeliveryView() {

  const myOrders: DeliveryOrder[] = [
    {
      id: 1001,
      total: 249,
      customer_name: "Maria Fernanda",
      address: "Av. Próceres de la Independencia 3070",
      phone: "987654321",
    },
    {
      id: 1002,
      total: 189,
      customer_name: "Carlos Ramirez",
      address: "SJL - Las Flores",
      phone: "912345678",
    },
  ];

  const confirmDelivery = async (id: number) => {

    const result = await Swal.fire({
      title: "¿Confirmar entrega?",
      text: `Pedido #${id} será marcado como entregado`,
      icon: "question",
      showCancelButton: true,

      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#ef4444",

      confirmButtonText: "Sí, entregar",
      cancelButtonText: "Cancelar",

      background: "#ffffff",
      color: "#0f172a",

      customClass: {
        popup: 'rounded-[20px]',
      },
    });

    if (result.isConfirmed) {

      // API CALL
      // await fetch(...)

      Swal.fire({
        title: "Entrega Confirmada",
        text: `Pedido #${id} entregado correctamente`,
        icon: "success",
        confirmButtonColor: "#16a34a",
        timer: 2000,
        showConfirmButton: false,
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4">

      <div className="max-w-md mx-auto">

        <h1 className="text-3xl font-black text-slate-800 mb-6">
          Mis Entregas
        </h1>

        <div className="space-y-4">

          {myOrders.map((order) => (

            <div
              key={order.id}
              className="
                bg-white
                rounded-3xl
                shadow-lg
                border-l-4
                border-blue-500
                p-5
              "
            >

              {/* HEADER */}
              <div className="flex items-start justify-between mb-4">

                <div>
                  <span
                    className="
                      bg-blue-100
                      text-blue-700
                      text-xs
                      font-black
                      px-3
                      py-1
                      rounded-full
                    "
                  >
                    Pedido #{order.id}
                  </span>

                  <h2 className="text-lg font-black text-slate-800 mt-3">
                    {order.customer_name}
                  </h2>
                </div>

                <div className="text-right">
                  <p className="text-xs text-slate-400 font-bold uppercase">
                    Total
                  </p>

                  <p className="text-lg font-black text-emerald-600">
                    S/ {order.total}
                  </p>
                </div>

              </div>

              {/* ADDRESS */}
              <div className="flex gap-3 mb-3">

                <MapPin
                  className="text-slate-500 shrink-0 mt-1"
                  size={18}
                />

                <p className="text-sm text-slate-600">
                  {order.address}
                </p>

              </div>

              {/* PHONE */}
              <div className="flex gap-3 mb-5">

                <Phone
                  className="text-slate-500 shrink-0"
                  size={18}
                />

                <p className="text-sm text-slate-600">
                  {order.phone}
                </p>

              </div>

              {/* BUTTON */}
              <button
                onClick={() => confirmDelivery(order.id)}
                className="
                  w-full
                  h-12
                  rounded-2xl
                  bg-green-600
                  hover:bg-green-700
                  active:scale-[0.98]
                  transition-all
                  text-white
                  font-black
                  flex
                  items-center
                  justify-center
                  gap-2
                  shadow-lg
                "
              >

                <CheckCircle2 size={20} />

                Confirmar Entrega

              </button>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
}