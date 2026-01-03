import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/context/ThemeContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const VitalsChart = ({ 
  title, 
  data, 
  dataLabel = 'Value',
  color = '#3b82f6',
  fill = true,
  height = 300,
  showLegend = false,
  secondaryData = null,
  secondaryLabel = 'Secondary',
  secondaryColor = '#ef4444'
}) => {
  const { isDark } = useTheme();
  const labels = data.map(point => point.label);
  const values = data.map(point => point.value);

  const chartData = {
    labels,
    datasets: [
      {
        label: dataLabel,
        data: values,
        borderColor: color,
        backgroundColor: fill ? `${color}20` : 'transparent',
        fill: fill,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5,
        pointBackgroundColor: color,
      },
      ...(secondaryData ? [{
        label: secondaryLabel,
        data: secondaryData.map(point => point.value),
        borderColor: secondaryColor,
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5,
        pointBackgroundColor: secondaryColor,
        borderDash: [5, 5],
      }] : []),
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        position: 'top',
        labels: {
          color: isDark ? '#94a3b8' : '#64748b',
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: color,
        borderWidth: 1,
        padding: 10,
        displayColors: true,
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 8,
          color: isDark ? '#64748b' : '#64748b',
          font: {
            size: 11,
          },
        },
        border: {
          color: isDark ? '#334155' : '#e2e8f0',
        },
      },
      y: {
        display: true,
        grid: {
          color: isDark ? '#1e293b' : '#e2e8f0',
        },
        ticks: {
          color: isDark ? '#64748b' : '#64748b',
          font: {
            size: 11,
          },
        },
        border: {
          color: isDark ? '#334155' : '#e2e8f0',
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-gray-700 dark:text-gray-200">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: `${height}px` }}>
          <Line data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
};

export default VitalsChart;
