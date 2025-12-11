// Archivo: DailyGainChart.jsx

import React from 'react';
import { Line } from 'react-chartjs-2';
import { 
    Chart as ChartJS, 
    CategoryScale, 
    LinearScale, 
    PointElement, 
    LineElement, 
    Title, 
    Tooltip, 
    Legend 
} from 'chart.js';

// Registrar los componentes necesarios de Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const DailyGainChart = ({ data }) => {
    // Los datos vienen en formato: [{ date: 'YYYY-MM-DD', gain: X }, ...]

    const chartData = {
        // Etiquetas del eje X (Fechas)
        labels: data.map(item => item.date),
        datasets: [
            {
                label: 'Ganancia Diaria ($)',
                // Valores del eje Y (Ganancias)
                data: data.map(item => item.gain.toFixed(2)), 
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.3, // Suaviza la línea
                fill: true, // Rellena el área bajo la línea
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Tendencia de Ganancias Agrupadas por Día',
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Ganancia ($)',
                },
            },
            x: {
                title: {
                    display: true,
                    text: 'Fecha',
                },
            }
        }
    };

    return (
        <div style={{ width: '100%', maxWidth: '800px', margin: '20px auto' }}>
            <Line data={chartData} options={options} />
        </div>
    );
};

export default DailyGainChart;